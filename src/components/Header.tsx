import React from 'react';
import { Settings2, CircleDollarSign, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenEdit: () => void;
  onOpenFunding: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenEdit, onOpenFunding, onLogout }) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-stone-900 flex items-center gap-2">
          Budget <span className="text-stone-400 font-normal">/</span> <span className="text-blue-600">Monthly</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-blue-700 animate-pulse" />
          <p className="text-stone-500 font-bold text-[10px] uppercase tracking-widest">Live Sync Enabled</p>
        </div>
      </div>
      <div className="flex gap-3 w-full lg:w-auto">
        <button 
          onClick={onOpenEdit}
          className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-all"
        >
          <Settings2 size={20} />
        </button>
        <button
          onClick={onOpenFunding}
          className="flex-1 lg:flex-none px-4 h-10 rounded-2xl bg-blue-700/10 border border-blue-700/20 text-blue-600 flex items-center justify-center gap-2 text-sm font-bold hover:bg-blue-700/20 transition-all"
        >
          <CircleDollarSign size={18} />
          <span>Add Funds</span>
        </button>
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-all"
          title="Log Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
