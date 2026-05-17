import React from 'react';
import { Calendar } from 'lucide-react';
import { Totals, DateMetrics } from '../types';

interface BudgetStatsProps {
  totals: Totals;
  dateMetrics: DateMetrics;
}

export const BudgetStats: React.FC<BudgetStatsProps> = ({ totals, dateMetrics }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/70 py-4 px-6 rounded-[20px] border border-stone-200 backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Available Budget</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-stone-900">${totals.remaining.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <p className="text-[10px] font-bold text-blue-700/60 mt-2 uppercase tracking-tighter italic">Total Rollover</p>
      </div>

      <div className="bg-white/70 py-4 px-6 rounded-[20px] border border-stone-200 backdrop-blur-sm relative overflow-hidden group">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Days Remaining</p>
        <p className="text-2xl font-black text-stone-900">{dateMetrics.daysLeft}</p>
        <p className="text-[10px] font-medium text-stone-400 mt-2">Until next cycle</p>
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <Calendar size={40} className="text-blue-700" />
        </div>
      </div>
    </div>
  );
};
