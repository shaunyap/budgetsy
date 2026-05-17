import React from 'react';
import { Wallet } from 'lucide-react';
import { EnvelopeStat, DateMetrics } from '../types';

interface EnvelopeListProps {
  envelopeStats: EnvelopeStat[];
  dateMetrics: DateMetrics;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const EnvelopeList: React.FC<EnvelopeListProps> = ({ envelopeStats, dateMetrics, selectedId, onSelect }) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-stone-400" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Active Envelopes</h3>
        </div>
        {selectedId && (
          <p className="text-[9px] font-black uppercase text-blue-700 bg-blue-700/10 px-2 py-0.5 rounded-full animate-pulse">
            Filter Active
          </p>
        )}
      </div>

      <div className="bg-white/50 rounded-[20px] border border-stone-200 divide-y divide-stone-200/50 overflow-hidden">
        {envelopeStats.map(env => (
          <button
            key={env.id}
            onClick={() => onSelect(env.id)}
            className={`w-full text-left py-4 px-5 transition-all duration-300 relative group ${selectedId === env.id
              ? 'bg-blue-700/5 ring-inset ring-2 ring-blue-700/20'
              : 'hover:bg-white active:bg-stone-100'
              }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-lg leading-none text-stone-900 group-hover:text-blue-700 transition-colors">{env.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-stone-500 font-mono uppercase tracking-tight">Available: ${env.available.toLocaleString('en-US', {maximumFractionDigits:0})}</span>
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${env.isAhead ? 'bg-blue-700/10 text-blue-600' : 'bg-rose-500/10 text-rose-400'}`}>
                    {env.isAhead ? 'Ahead' : 'Behind'} ${Math.round(env.pacingDiff).toLocaleString()}
                    {!env.isAhead && env.daysBehind ? ` (${Math.ceil(env.daysBehind)} Days)` : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-stone-600">${env.monthSpent.toLocaleString('en-US', {maximumFractionDigits:0})} <span className="text-[9px] text-stone-400">spent</span></p>
                <p className="text-[9px] text-stone-400 font-bold uppercase mt-1">of ${env.defaultAlloc.toLocaleString()} cap</p>
              </div>
            </div>

            <div className="relative h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <div
                className={`h-full transition-all duration-1000 ease-out ${env.isAhead ? 'bg-emerald-700' : 'bg-rose-700'}`}
                style={{ width: `${env.monthPacePercent}%` }}
              />
              {/* Pacing Marker */}
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-stone-900/40 z-10 shadow-[0_0_2px_rgba(0,0,0,0.1)]"
                style={{ left: `${dateMetrics.monthProgress * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
