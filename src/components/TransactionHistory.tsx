import React, { useState, useMemo } from 'react';
import { History, Search, Receipt, Trash2, Edit2, X } from 'lucide-react';
import { Transaction } from '../types';
import { db, APP_ID } from '../config/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { auth } from '../config/firebase';

interface TransactionHistoryProps {
  transactions: Transaction[];
  selectedEnvelopeId: string | null;
  onClearFilter: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  transactions, 
  selectedEnvelopeId, 
  onClearFilter,
  onEditTransaction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesEnvelope = !selectedEnvelopeId || t.categoryId === selectedEnvelopeId;
      return matchesSearch && matchesEnvelope;
    });
  }, [transactions, searchTerm, selectedEnvelopeId]);

  const handleDelete = async (transaction: Transaction) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm("Are you sure you want to delete this transaction? This will refund the amount to your envelope.")) {
      return;
    }

    setIsDeleting(transaction.id);
    try {
      const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
      const batch = writeBatch(db);

      // 1. Delete the transaction
      const transRef = doc(db, userPath, 'transactions', transaction.id);
      batch.delete(transRef);

      // 2. Refund the envelope balance
      const envRef = doc(db, userPath, 'envelopes', transaction.categoryId);
      batch.update(envRef, {
        spent: increment(-transaction.personalImpact)
      });

      await batch.commit();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert("Failed to delete transaction.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section className="space-y-6 pt-4">
      <div className="flex flex-col gap-4 mb-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-stone-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">
              {selectedEnvelopeId ? 'Envelope History' : 'History'}
            </h3>
          </div>
          {selectedEnvelopeId && (
            <button 
              onClick={onClearFilter}
              className="text-[10px] font-black uppercase text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Clear Filter
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input 
            type="text"
            placeholder="Find merchant or notes..."
            className="w-full bg-white/80 border border-stone-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-700 outline-none transition-all placeholder:text-stone-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white/50 rounded-[20px] border border-stone-200 divide-y divide-zinc-900/50 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm italic font-medium">
            No matching transactions found.
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="py-3 px-5 flex items-center justify-between hover:bg-white/70 transition-colors group relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-200 flex items-center justify-center">
                  <Receipt size={18} className="text-stone-500" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight text-stone-900">{t.merchant}</p>
                  <p className="text-[9px] text-stone-500 uppercase font-black tracking-widest mt-1">{t.categoryName}</p>
                  {t.notes && (
                    <p className="text-xs text-stone-600 mt-2 italic font-medium leading-relaxed max-w-[200px]">"{t.notes}"</p>
                  )}
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="font-mono font-black text-sm text-stone-900">-${t.personalImpact.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase mt-1">{t.date}</p>
                  {t.splitType !== 'personal' && (
                    <span className="text-[8px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-black uppercase mt-1 inline-block">Shared</span>
                  )}
                </div>
                
                {/* Actions on Hover */}
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-stone-200">
                  <button 
                    onClick={() => onEditTransaction(t)}
                    className="p-2 text-blue-700 hover:bg-blue-700/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(t)}
                    disabled={isDeleting === t.id}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
