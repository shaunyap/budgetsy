import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db, APP_ID } from '../../config/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope, Transaction } from '../../types';

interface EditTransactionModalProps {
  user: User | null;
  envelopes: Envelope[];
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ user, envelopes, transaction, isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState<'personal' | '50/50' | 'custom'>('personal');
  const [customUserAmount, setCustomUserAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      setAmount(transaction.totalAmount.toString());
      setMerchant(transaction.merchant);
      setNotes(transaction.notes || '');
      setTransactionDate(transaction.date);
      setCategory(transaction.categoryId);
      setSplitType(transaction.splitType);
      setCustomUserAmount(transaction.personalImpact.toString());
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !transaction) return;

    setIsSaving(true);
    const numAmount = parseFloat(amount) || 0;
    let newPersonalImpact = numAmount;
    let spouseOwed = 0;

    if (splitType === '50/50') {
      newPersonalImpact = numAmount / 2;
      spouseOwed = numAmount / 2;
    } else if (splitType === 'custom') {
      newPersonalImpact = parseFloat(customUserAmount) || 0;
      spouseOwed = numAmount - newPersonalImpact;
    }

    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
    const selectedEnv = envelopes.find(en => en.id === category);

    try {
      const batch = writeBatch(db);
      const transRef = doc(db, userPath, 'transactions', transaction.id);

      // 1. Update Transaction
      batch.update(transRef, {
        timestamp: new Date(transactionDate).getTime(),
        merchant: merchant || 'Misc Expense',
        notes,
        categoryId: category,
        categoryName: selectedEnv?.name || 'Misc',
        totalAmount: numAmount,
        personalImpact: newPersonalImpact,
        spouseOwed,
        date: transactionDate,
        splitType
      });

      // 2. Adjust Envelope balances
      // If category changed, refund old and charge new
      if (category !== transaction.categoryId) {
        const oldEnvRef = doc(db, userPath, 'envelopes', transaction.categoryId);
        batch.update(oldEnvRef, {
          spent: increment(-transaction.personalImpact)
        });

        const newEnvRef = doc(db, userPath, 'envelopes', category);
        batch.update(newEnvRef, {
          spent: increment(newPersonalImpact)
        });
      } else {
        // Just adjust the difference in the same category
        const diff = newPersonalImpact - transaction.personalImpact;
        const envRef = doc(db, userPath, 'envelopes', category);
        batch.update(envRef, {
          spent: increment(diff)
        });
      }

      await batch.commit();
      onClose();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[20px] sm:rounded-[20px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-stone-900">Edit Expense</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors"><X size={28} /></button>
        </div>

        <form onSubmit={handleUpdateTransaction} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Merchant</label>
              <input
                autoFocus
                type="text"
                className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-blue-700 outline-none text-stone-900 font-medium"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-10 pr-4 text-xl font-mono focus:ring-2 focus:ring-blue-700 outline-none text-stone-900"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Date</label>
                <input
                  type="date"
                  className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 px-4 text-sm focus:ring-2 focus:ring-blue-700 outline-none text-stone-900 font-medium"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Envelope</label>
                <select
                  className="w-full bg-stone-100 border border-stone-200 rounded-2xl p-4 appearance-none outline-none focus:ring-2 focus:ring-blue-700 text-sm font-bold text-stone-900"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {envelopes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Split Type</label>
                <select
                  className="w-full bg-stone-100 border border-stone-200 rounded-2xl p-4 appearance-none outline-none focus:ring-2 focus:ring-blue-700 text-sm font-bold text-stone-900"
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as any)}
                >
                  <option value="personal">Personal 100%</option>
                  <option value="50/50">Split 50/50</option>
                  <option value="custom">Custom Split</option>
                </select>
              </div>
            </div>

            {splitType === 'custom' && (
              <div className="p-4 bg-blue-700/5 rounded-2xl border border-blue-700/20">
                <label className="block text-[9px] font-black text-blue-700 uppercase mb-2 text-center">My Impact($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-transparent border-none p-0 text-3xl font-mono text-center text-stone-900 focus:ring-0 outline-none"
                  value={customUserAmount}
                  onChange={(e) => setCustomUserAmount(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Notes</label>
              <textarea
                rows={2}
                className="w-full bg-stone-100 border border-stone-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-700 outline-none resize-none text-stone-700"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-700 text-white font-black py-5 rounded-[20px] hover:bg-blue-600 transition-all shadow-xl shadow-blue-700/20 active:scale-95 text-lg uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="animate-spin" size={20} />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};
