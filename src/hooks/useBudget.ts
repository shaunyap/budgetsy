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
          DEFAULT_ENVELOPES.forEach(env => {
            const docRef = doc(collection(db, userPath, 'envelopes'));
            batch.set(docRef, env);
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
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate.getMonth() === dateMetrics.currentMonth && tDate.getFullYear() === dateMetrics.currentYear;
    });

    const envelopeStats = envelopes.map(env => {
      const personalImpacts = currentMonthTransactions
        .filter(t => t.categoryId === env.id)
        .map(t => Number(t.personalImpact) || 0);
      
      const monthSpent = personalImpacts.reduce((sum, val) => sum + val, 0);

      const allocated = Number(env.allocated) || 0;
      const spent = Number(env.spent) || 0;
      const defaultAlloc = Number(env.defaultAlloc) || 0;

      const available = allocated - spent;
      const expectedSpendAtThisPoint = defaultAlloc * dateMetrics.monthProgress;
      const isAhead = monthSpent < expectedSpendAtThisPoint;
      const pacingDiff = Math.abs(monthSpent - expectedSpendAtThisPoint);
      
      let daysBehind = 0;
      if (!isAhead && monthSpent > 0 && dateMetrics.currentDay > 0) {
        const currentPerDayRate = monthSpent / dateMetrics.currentDay;
        daysBehind = pacingDiff / currentPerDayRate;
      }

      return {
        daysBehind,
        ...env,
        monthSpent,
        available,
        isAhead,
        pacingDiff,
        monthPacePercent: Math.min(100, (monthSpent / (defaultAlloc || 1)) * 100)
      };
    });

    const totalBudgetRemaining = envelopeStats.reduce((acc, e) => acc + e.available, 0);
    const totalSpentThisMonth = currentMonthTransactions.reduce((acc, t) => acc + (Number(t.personalImpact) || 0), 0);

    return {
      remaining: totalBudgetRemaining,
      totalSpentThisMonth,
      envelopeStats
    };
  }, [transactions, envelopes, dateMetrics]);

  return { envelopes, transactions, loading, dateMetrics, totals };
};
