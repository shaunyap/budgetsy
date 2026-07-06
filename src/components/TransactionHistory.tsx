import React, { useState, useMemo, useEffect } from 'react';
import { History, Search, Receipt, Edit2, X } from 'lucide-react';
import { Transaction } from '../types';

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 150;

  // Reset page to 1 when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEnvelopeId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesEnvelope = !selectedEnvelopeId || t.categoryId === selectedEnvelopeId;
      return matchesSearch && matchesEnvelope;
    });
  }, [transactions, searchTerm, selectedEnvelopeId]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

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
        {paginatedTransactions.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm italic font-medium">
            No matching transactions found.
          </div>
        ) : (
          paginatedTransactions.map(t => (
            <div key={t.id} className="py-3 px-5 flex items-center justify-between hover:bg-white/70 transition-colors group relative">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-stone-200 flex items-center justify-center flex-shrink-0">
                  <Receipt size={18} className="text-stone-500 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight text-stone-900 truncate">{t.merchant}</p>
                  <p className="text-[9px] text-stone-500 uppercase font-black tracking-widest mt-1 truncate">{t.categoryName}</p>
                  {t.notes && (
                    <p className="text-xs text-stone-600 mt-2 italic font-medium leading-relaxed max-w-[200px] truncate">"{t.notes}"</p>
                  )}
                </div>
              </div>
              <div className="text-right flex items-center gap-3 flex-shrink-0">
                <div>
                  <p className={`font-mono font-black text-sm ${t.personalImpact < 0 ? 'text-emerald-600' : 'text-stone-900'} flex-shrink-0`}>
                    {t.personalImpact < 0 ? '+' : '-'}${Math.abs(t.personalImpact).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase mt-1 flex-shrink-0">{t.date}</p>
                  {t.splitType !== 'personal' && (
                    <span className="text-[8px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-black uppercase mt-1 inline-block flex-shrink-0">Shared</span>
                  )}
                </div>
                
                {/* Always visible Edit Button */}
                <div className="pl-3 border-l border-stone-200 flex items-center self-stretch flex-shrink-0">
                  <button 
                    onClick={() => onEditTransaction(t)}
                    className="p-2 text-stone-400 hover:text-blue-700 hover:bg-blue-50/50 rounded-xl transition-all active:scale-90 flex-shrink-0"
                    title="Edit"
                  >
                    <Edit2 size={16} className="flex-shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Page {currentPage} of {totalPages} ({filteredTransactions.length} items)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-black uppercase text-stone-600 hover:text-stone-900 hover:border-stone-300 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-black uppercase text-stone-600 hover:text-stone-900 hover:border-stone-300 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
