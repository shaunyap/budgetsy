import React, { useState, useEffect } from 'react';
import { db, APP_ID } from '../../config/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope } from '../../types';
import { Loader2, X, Plus, Trash2 } from 'lucide-react';

interface FundingModalProps {
  user: User | null;
  envelopes: Envelope[];
  isOpen: boolean;
  onClose: () => void;
}

export const FundingModal: React.FC<FundingModalProps> = ({ user, envelopes, isOpen, onClose }) => {
  const [editingEnvelopes, setEditingEnvelopes] = useState<Envelope[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingEnvelopes([...envelopes]);
    }
  }, [isOpen, envelopes]);

  if (!isOpen) return null;

  const handleProcessFunding = async (runFunding = false) => {
    if (!user) {
      console.warn("No user logged in.");
      return;
    }

    if (runFunding) {
      setIsFunding(true);
    } else {
      setIsApplying(true);
    }

    const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
    console.log("Updating envelopes for path:", userPath);

    try {
      const batch = writeBatch(db);

      // 1. Identify envelopes to delete (present in DB but not in editing list)
      const editingIds = new Set(editingEnvelopes.map(e => e.id));
      const currentDocs = await getDocs(collection(db, userPath, 'envelopes'));
      
      currentDocs.forEach(d => {
        if (!editingIds.has(d.id)) {
          batch.delete(d.ref);
        }
      });

      // 2. Update or Create envelopes
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      editingEnvelopes.forEach(env => {
        const envRef = doc(db, userPath, 'envelopes', env.id);
        const allocated = Number(env.allocated) || 0;
        const defaultAlloc = Number(env.defaultAlloc) || 0;

        const updateData: any = {
          name: env.name,
          defaultAlloc: defaultAlloc,
          color: env.color || 'bg-blue-700'
        };

        if (runFunding) {
          updateData.allocated = allocated + defaultAlloc;
          updateData.lastFunded = currentYearMonth;
        }

        // Use set with merge: true so it merges on update and creates if missing
        batch.set(envRef, updateData, { merge: true });
      });

      await batch.commit();
      console.log("Envelopes updated successfully!");
      onClose();
    } catch (err: any) {
      console.error("Error processing envelopes update:", err);
      if (err.code === 'permission-denied') {
        alert("Firestore Permission Denied. Please double-check Firestore rules.");
      } else {
        alert(`Error: ${err.message || "Failed to apply changes."}`);
      }
    } finally {
      setIsApplying(false);
      setIsFunding(false);
    }
  };

  const handleAddEnvelope = () => {
    const newEnv: Envelope = {
      id: Date.now().toString(),
      name: 'New Category',
      allocated: 0,
      spent: 0,
      color: 'bg-blue-700',
      defaultAlloc: 0
    };
    setEditingEnvelopes([...editingEnvelopes, newEnv]);
  };

  const handleDeleteEnvelope = (id: string) => {
    setEditingEnvelopes(editingEnvelopes.filter(e => e.id !== id));
  };

  const totalMonthlyFunding = editingEnvelopes.reduce((acc, e) => acc + (Number(e.defaultAlloc) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-100/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-stone-200 rounded-[20px] p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Manage & Fund Envelopes</h2>
            <p className="text-xs text-stone-500">Edit targets and distribute monthly allocations</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Envelope list scroll container */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
          <div className="bg-white/50 rounded-[20px] border border-stone-200 divide-y divide-stone-200/50 overflow-hidden">
            {editingEnvelopes.map((env, idx) => (
              <div key={env.id} className="py-4 px-5 relative hover:bg-stone-50 transition-colors group">
                <div className="grid grid-cols-2 gap-4 pr-10">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-stone-500 mb-1">Name</label>
                    <input 
                      className="w-full bg-transparent border-none p-0 text-stone-900 font-bold focus:ring-0 text-sm"
                      value={env.name}
                      onChange={(e) => {
                        const newEnvs = [...editingEnvelopes];
                        newEnvs[idx].name = e.target.value;
                        setEditingEnvelopes(newEnvs);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-stone-500 mb-1">Monthly Budget($)</label>
                    <input
                      type="number"
                      className="w-full bg-transparent border-none p-0 text-stone-900 font-mono font-bold focus:ring-0 text-sm"
                      value={env.defaultAlloc || ''}
                      placeholder="0.00"
                      onChange={(e) => {
                        const newEnvs = [...editingEnvelopes];
                        newEnvs[idx].defaultAlloc = parseFloat(e.target.value) || 0;
                        setEditingEnvelopes(newEnvs);
                      }}
                      required
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteEnvelope(env.id)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Envelope"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAddEnvelope}
            className="w-full py-4 rounded-[20px] border-2 border-dashed border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
          >
            <Plus size={16} /> Add Envelope
          </button>
        </div>

        {/* Modal Actions */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Monthly target</span>
            <span className="text-stone-900 font-mono font-black text-lg">
              ${totalMonthlyFunding.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleProcessFunding(false)}
              disabled={isApplying || isFunding}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black py-4 rounded-[20px] transition-all text-xs uppercase tracking-wider border border-stone-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                'Save Envelopes'
              )}
            </button>
            <button
              onClick={() => handleProcessFunding(true)}
              disabled={isApplying || isFunding || editingEnvelopes.length === 0}
              className="flex-[2] bg-blue-700 hover:bg-blue-600 text-white font-black py-4 rounded-[20px] transition-all text-xs uppercase tracking-widest shadow-lg shadow-blue-700/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isFunding ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Funding...
                </>
              ) : (
                'Confirm Add Funds'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
