import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import { db, APP_ID } from '../../config/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope, Transaction } from '../../types';

interface EditTransactionModalProps {
  user: User | null;
  envelopes: Envelope[];
  transactions: Transaction[];
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ user, envelopes, transactions, transaction, isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState<'personal' | '50/50' | 'custom'>('personal');
  const [customUserAmount, setCustomUserAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  interface MerchantSuggestion {
    name: string;
    categoryId: string;
    categoryName: string;
    timestamp: number;
  }

  const uniqueMerchants = useMemo(() => {
    const seen = new Set<string>();
    const list: MerchantSuggestion[] = [];

    for (const t of transactions) {
      if (!t.merchant || t.merchant.trim() === '' || t.merchant.toLowerCase().trim() === 'misc expense') {
        continue;
      }
      const key = t.merchant.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: t.merchant.trim(),
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          timestamp: t.timestamp
        });
      }
    }
    return list;
  }, [transactions]);

  const filteredSuggestions = useMemo(() => {
    const query = merchant.toLowerCase().trim();
    if (!query) {
      // Show 5 most recent merchants when input is empty
      return uniqueMerchants.slice(0, 5);
    }
    return uniqueMerchants.filter(item =>
      item.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [uniqueMerchants, merchant]);

  const selectSuggestion = (suggestion: MerchantSuggestion) => {
    setMerchant(suggestion.name);
    // Auto-categorize if the envelope category exists
    if (envelopes.some(env => env.id === suggestion.categoryId)) {
      setCategory(suggestion.categoryId);
    }
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

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

      const [year, month, day] = transactionDate.split('-').map(Number);
      const localTimestamp = new Date(year, month - 1, day).getTime();

      // 1. Update Transaction
      batch.update(transRef, {
        timestamp: localTimestamp,
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

  const handleDeleteTransaction = async () => {
    if (!user || !transaction) return;

    if (!confirm("Are you sure you want to delete this transaction? This will refund the amount to your envelope.")) {
      return;
    }

    setIsDeleting(true);
    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;

    try {
      const batch = writeBatch(db);

      // 1. Delete transaction
      const transRef = doc(db, userPath, 'transactions', transaction.id);
      batch.delete(transRef);

      // 2. Refund the envelope balance
      const envRef = doc(db, userPath, 'envelopes', transaction.categoryId);
      batch.update(envRef, {
        spent: increment(-transaction.personalImpact)
      });

      await batch.commit();
      onClose();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert("Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[20px] sm:rounded-[20px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-stone-900">Edit Transaction</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors"><X size={28} /></button>
        </div>

        <form onSubmit={handleUpdateTransaction} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Merchant</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-stone-100 border border-stone-200 rounded-[20px] py-4 px-5 text-sm focus:ring-2 focus:ring-blue-700 outline-none text-stone-900 font-medium"
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    setShowSuggestions(true);
                    setFocusedIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Delay closing to allow click event to register on suggestions
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onKeyDown={handleKeyDown}
                  required
                  autoComplete="off"
                />

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-2 bg-white border border-stone-200 rounded-[20px] shadow-2xl max-h-52 overflow-y-auto divide-y divide-stone-100 overflow-x-hidden">
                    {filteredSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onMouseDown={(e) => {
                          // Prevent input blur before click registers
                          e.preventDefault();
                          selectSuggestion(suggestion);
                        }}
                        className={`px-5 py-3.5 cursor-pointer text-sm flex justify-between items-center transition-colors ${index === focusedIndex ? 'bg-blue-700/5 text-blue-700 font-bold' : 'text-stone-700 hover:bg-stone-50 hover:text-stone-950'
                          }`}
                      >
                        <span className="font-semibold">{suggestion.name}</span>
                        <span className="text-[9px] bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full font-black uppercase text-stone-500 tracking-wider">
                          {suggestion.categoryName}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
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
                  inputMode="decimal"
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDeleteTransaction}
              disabled={isSaving || isDeleting}
              className="flex-1 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 font-bold py-5 rounded-[20px] transition-all border border-stone-200 hover:border-rose-200 active:scale-95 text-sm uppercase tracking-wider flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isDeleting ? <Loader2 className="animate-spin flex-shrink-0" size={16} /> : <Trash2 size={16} className="flex-shrink-0" />}
              Delete
            </button>
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="flex-[2] bg-blue-700 text-white font-black py-5 rounded-[20px] hover:bg-blue-600 transition-all shadow-xl shadow-blue-700/20 active:scale-95 text-sm uppercase tracking-widest flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isSaving && <Loader2 className="animate-spin flex-shrink-0" size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
