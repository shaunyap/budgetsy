import React, { useState } from 'react';
import { db, APP_ID } from '../../config/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope } from '../../types';
import { Loader2, X } from 'lucide-react';

interface FundingModalProps {
  user: User | null;
  envelopes: Envelope[];
  isOpen: boolean;
  onClose: () => void;
}

export const FundingModal: React.FC<FundingModalProps> = ({ user, envelopes, isOpen, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleProcessFunding = async () => {
    if (!user) {
      console.warn("Cannot add funds: No user logged in.");
      return;
    }
    
    if (envelopes.length === 0) {
      console.warn("Cannot add funds: No envelopes found for this user.");
      return;
    }

    setIsProcessing(true);
    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
    console.log("Attempting to add funds for path:", userPath);

    try {
      const batch = writeBatch(db);

      envelopes.forEach(env => {
        const envRef = doc(db, userPath, 'envelopes', env.id);
        const updateData = {
          allocated: (Number(env.allocated) || 0) + (Number(env.defaultAlloc) || 0)
        };
        console.log(`Setting envelope ${env.id} with data (merge: true):`, updateData);
        // Use set with merge: true so it works even if the document was missing
        batch.set(envRef, updateData, { merge: true });
      });

      await batch.commit();
      console.log("Batch commit successful!");
      onClose();
    } catch (err: any) {
      console.error("FULL ERROR DETAILS:", err);
      if (err.code === 'permission-denied') {
        alert("Firestore Permission Denied. Please double-check your Rules and make sure you clicked 'Publish'.");
      } else {
        alert(`Error: ${err.message || "Failed to add funds."}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-[20px] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-stone-900">Add Monthly Funds</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors"><X size={24} /></button>
        </div>
        <p className="text-sm text-stone-600 mb-8 leading-relaxed">
          This will add your defined monthly targets to your current rollover balances. Total injection:
          <span className="text-stone-900 font-bold block text-lg mt-1">
            ${envelopes.reduce((acc, e) => acc + (Number(e.defaultAlloc) || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </p>

        <button
          onClick={handleProcessFunding}
          disabled={isProcessing || envelopes.length === 0}
          className="w-full bg-blue-700 text-white font-black py-5 rounded-[20px] hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-700 transition-all text-sm uppercase tracking-widest shadow-lg shadow-blue-700/20 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            'Confirm Add Funds'
          )}
        </button>
        
        {envelopes.length === 0 && (
          <p className="text-rose-400 text-[10px] font-bold mt-4 text-center uppercase tracking-widest">
            No active envelopes found to fund.
          </p>
        )}
      </div>
    </div>
  );
};
