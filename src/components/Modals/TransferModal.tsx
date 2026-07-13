import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db, APP_ID } from '../../config/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope } from '../../types';

interface TransferModalProps {
  user: User | null;
  envelopes: Envelope[];
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ user, envelopes, isOpen, onClose }) => {
  const [fromEnvelopeId, setFromEnvelopeId] = useState('');
  const [toEnvelopeId, setToEnvelopeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [transferDate, setTransferDate] = useState(getLocalDateString());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromEnvelopeId('');
      setToEnvelopeId('');
      setAmount('');
      setNotes('');
      setTransferDate(getLocalDateString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      alert("Please enter a positive amount.");
      return;
    }

    if (fromEnvelopeId === toEnvelopeId) {
      alert("Source and destination envelopes must be different.");
      return;
    }

    const fromEnv = envelopes.find(env => env.id === fromEnvelopeId);
    const toEnv = envelopes.find(env => env.id === toEnvelopeId);

    if (!fromEnv || !toEnv) {
      alert("Envelopes not found.");
      return;
    }

    setIsProcessing(true);
    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;

    try {
      const batch = writeBatch(db);

      const [year, month, day] = transferDate.split('-').map(Number);
      const localTimestamp = new Date(year, month - 1, day).getTime();

      // 1. Create Transaction for From Envelope (Outflow)
      const fromTransRef = doc(collection(db, userPath, 'transactions'));
      batch.set(fromTransRef, {
        timestamp: localTimestamp,
        merchant: `Transfer to ${toEnv.name}`,
        notes: notes || 'Balance Transfer',
        categoryId: fromEnv.id,
        categoryName: fromEnv.name,
        totalAmount: numAmount,
        personalImpact: numAmount,
        spouseOwed: 0,
        date: transferDate,
        splitType: 'personal'
      });

      // 2. Create Transaction for To Envelope (Inflow)
      const toTransRef = doc(collection(db, userPath, 'transactions'));
      batch.set(toTransRef, {
        timestamp: localTimestamp,
        merchant: `Transfer from ${fromEnv.name}`,
        notes: notes || 'Balance Transfer',
        categoryId: toEnv.id,
        categoryName: toEnv.name,
        totalAmount: -numAmount,
        personalImpact: -numAmount,
        spouseOwed: 0,
        date: transferDate,
        splitType: 'personal'
      });

      // 3. Update From Envelope spent (increment positive)
      const fromEnvRef = doc(db, userPath, 'envelopes', fromEnv.id);
      batch.update(fromEnvRef, {
        spent: (Number(fromEnv.spent) || 0) + numAmount
      });

      // 4. Update To Envelope spent (increment negative)
      const toEnvRef = doc(db, userPath, 'envelopes', toEnv.id);
      batch.update(toEnvRef, {
        spent: (Number(toEnv.spent) || 0) - numAmount
      });

      await batch.commit();
      console.log("Transfer successful!");
      onClose();
    } catch (err: any) {
      console.error("Transfer Error:", err);
      alert(`Transfer failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border-t sm:border border-stone-200 rounded-t-[20px] sm:rounded-[20px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-stone-900">Transfer Funds</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors">
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">From Envelope</label>
              <select
                className="w-full bg-stone-100 border border-stone-200 rounded-[20px] p-4 appearance-none outline-none focus:ring-2 focus:ring-blue-700 text-sm font-bold text-stone-900"
                value={fromEnvelopeId}
                onChange={(e) => setFromEnvelopeId(e.target.value)}
                required
              >
                <option value="" disabled>Select Source...</option>
                {envelopes.map(e => <option key={e.id} value={e.id}>{e.name} (${Math.round(e.allocated - e.spent).toLocaleString()})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">To Envelope</label>
              <select
                className="w-full bg-stone-100 border border-stone-200 rounded-[20px] p-4 appearance-none outline-none focus:ring-2 focus:ring-blue-700 text-sm font-bold text-stone-900"
                value={toEnvelopeId}
                onChange={(e) => setToEnvelopeId(e.target.value)}
                required
              >
                <option value="" disabled>Select Destination...</option>
                {envelopes.map(e => <option key={e.id} value={e.id}>{e.name} (${Math.round(e.allocated - e.spent).toLocaleString()})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-stone-100 border border-stone-200 rounded-[20px] py-4 pl-10 pr-4 text-xl font-mono focus:ring-2 focus:ring-blue-700 outline-none text-stone-900"
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
                  className="w-full bg-stone-100 border border-stone-200 rounded-[20px] py-4 px-4 text-sm focus:ring-2 focus:ring-blue-700 outline-none text-stone-900 font-medium"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Notes</label>
              <textarea
                placeholder="Optional transfer reason..."
                rows={2}
                className="w-full bg-stone-100 border border-stone-200 rounded-[20px] p-4 text-sm focus:ring-2 focus:ring-blue-700 outline-none resize-none text-stone-700"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-blue-700 text-white font-black py-5 rounded-[20px] hover:bg-blue-600 transition-all shadow-xl shadow-blue-700/20 active:scale-95 text-lg uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Transferring...
              </>
            ) : (
              'Confirm Transfer'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
