import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  writeBatch, 
  query,
  orderBy
} from 'firebase/firestore';
import { db, APP_ID } from '../config/firebase';
import { User } from 'firebase/auth';
import { Envelope, Transaction, DateMetrics, Totals, DEFAULT_ENVELOPES } from '../types';

export const useBudget = (user: User | null) => {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEnvelopes([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
    console.log("Listening to Firestore data at:", userPath);

    // Listen to Envelopes
    const unsubEnvelopes = onSnapshot(
      collection(db, userPath, 'envelopes'),
      (snapshot) => {
        const envList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Envelope));
        console.log("Envelopes snapshot received:", envList.length, "items");
        
        if (envList.length === 0 && loading) {
          console.log("No envelopes found. Initializing defaults...");
          const batch = writeBatch(db);
          const now = new Date();
          const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          DEFAULT_ENVELOPES.forEach(env => {
            const docRef = doc(collection(db, userPath, 'envelopes'));
            batch.set(docRef, { ...env, lastFunded: currentYearMonth });
          });
          batch.commit().then(() => {
            console.log("Defaults initialized successfully.");
          }).catch(err => {
            console.error("Failed to initialize defaults:", err);
          });
        } else {
          setEnvelopes(envList);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error (Envelopes):", error);
        setLoading(false);
      }
    );

    // Listen to Transactions
    const unsubTransactions = onSnapshot(
      query(collection(db, userPath, 'transactions'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const transList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transList);
      },
      (error) => console.error("Firestore Error (Transactions):", error)
    );

    return () => {
      unsubEnvelopes();
      unsubTransactions();
    };
  }, [user]);

  const dateMetrics: DateMetrics = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    return {
      daysInMonth,
      currentDay,
      daysLeft: daysInMonth - currentDay,
      monthProgress: currentDay / daysInMonth,
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear()
    };
  }, []);

  const totals: Totals = useMemo(() => {
    const envelopeStats = envelopes.map(env => {
      const allTransactionsForEnv = transactions.filter(t => t.categoryId === env.id);
      
      const monthTransactionsForEnv = allTransactionsForEnv.filter(t => {
        const tDate = new Date(t.timestamp);
        return tDate.getMonth() === dateMetrics.currentMonth && tDate.getFullYear() === dateMetrics.currentYear;
      });
      
      const monthSpent = monthTransactionsForEnv.reduce((sum, t) => sum + (Number(t.personalImpact) || 0), 0);
      const spent = Number(env.spent) || 0;

      const allocated = Number(env.allocated) || 0;
      const defaultAlloc = Number(env.defaultAlloc) || 0;

      const currentYearMonth = `${dateMetrics.currentYear}-${String(dateMetrics.currentMonth + 1).padStart(2, '0')}`;
      const isFundedThisMonth = env.lastFunded === currentYearMonth;

      const allocatedBeforeCurrentMonth = isFundedThisMonth ? (allocated - defaultAlloc) : allocated;
      const spentBeforeCurrentMonth = spent - monthSpent;
      const rolloverFromLastMonth = allocatedBeforeCurrentMonth - spentBeforeCurrentMonth;

      const spentFromThisMonthEnvelope = monthSpent - rolloverFromLastMonth;
      const available = allocated - spent;

      const expectedSpendAtThisPoint = defaultAlloc * dateMetrics.monthProgress;
      const isAhead = spentFromThisMonthEnvelope < expectedSpendAtThisPoint;
      const pacingDiff = Math.abs(spentFromThisMonthEnvelope - expectedSpendAtThisPoint);
      
      let daysBehind = 0;
      if (!isAhead && spentFromThisMonthEnvelope > 0 && dateMetrics.currentDay > 0) {
        const currentPerDayRate = spentFromThisMonthEnvelope / dateMetrics.currentDay;
        daysBehind = pacingDiff / currentPerDayRate;
      }

      const monthPacePercent = Math.max(0, Math.min(100, (spentFromThisMonthEnvelope / (defaultAlloc || 1)) * 100));

      return {
        ...env,
        monthSpent,
        spent,
        available,
        isAhead,
        pacingDiff,
        monthPacePercent,
        daysBehind,
        rolloverFromLastMonth,
        spentFromThisMonthEnvelope
      };
    });

    const totalBudgetRemaining = envelopeStats.reduce((acc, e) => acc + e.available, 0);
    const totalSpentThisMonth = envelopeStats.reduce((acc, e) => acc + e.monthSpent, 0);
    const totalThisMonthLeft = envelopeStats.reduce((acc, e) => {
      const isFunded = e.lastFunded === `${dateMetrics.currentYear}-${String(dateMetrics.currentMonth + 1).padStart(2, '0')}`;
      const thisMonthBudget = isFunded ? e.defaultAlloc : 0;
      return acc + (thisMonthBudget - e.monthSpent);
    }, 0);
    const totalRollover = envelopeStats.reduce((acc, e) => acc + e.rolloverFromLastMonth, 0);

    // Sync envelope balances to localStorage for mission-control integration
    try {
      const balances = envelopeStats.reduce((acc, env) => {
        acc[env.name.toLowerCase().trim()] = env.available;
        return acc;
      }, {} as Record<string, number>);
      localStorage.setItem('budgetsy_remaining_balances', JSON.stringify(balances));
    } catch (e) {
      console.error("Failed to sync balances to localStorage", e);
    }

    return {
      remaining: totalBudgetRemaining,
      totalSpentThisMonth,
      envelopeStats,
      totalThisMonthLeft,
      totalRollover
    };
  }, [transactions, envelopes, dateMetrics]);

  return { envelopes, transactions, loading, dateMetrics, totals };
};
