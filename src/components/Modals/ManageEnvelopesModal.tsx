import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { db, APP_ID } from '../../config/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Envelope } from '../../types';

interface ManageEnvelopesModalProps {
  user: User | null;
  envelopes: Envelope[];
  isOpen: boolean;
  onClose: () => void;
}

export const ManageEnvelopesModal: React.FC<ManageEnvelopesModalProps> = ({ user, envelopes, isOpen, onClose }) => {
  const [editingEnvelopes, setEditingEnvelopes] = useState<Envelope[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingEnvelopes([...envelopes]);
    }
  }, [isOpen, envelopes]);

  if (!isOpen) return null;

  const handleSaveEnvelopes = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const userPath = `artifacts/${APP_ID}/users/${user.uid}`;
      const batch = writeBatch(db);

      // 1. Identify envelopes to delete (present in DB but not in editing list)
      const editingIds = new Set(editingEnvelopes.map(e => e.id));
      const currentDocs = await getDocs(collection(db, userPath, 'envelopes'));
      
      currentDocs.forEach(d => {
        if (!editingIds.has(d.id)) {
          batch.delete(d.ref);
        }
      });

      // 2. Update or Create envelopes (using their actual IDs)
      editingEnvelopes.forEach(env => {
        const envRef = doc(db, userPath, 'envelopes', env.id);
        batch.set(envRef, env, { merge: true });
      });

      await batch.commit();
      onClose();
    } catch (err) {
      console.error("Error saving envelopes:", err);
      alert("Failed to save changes. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-100/90 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-[20px] p-8 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Manage Envelopes</h2>
            <p className="text-xs text-stone-500">Customize categories & targets</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white/50 rounded-[20px] border border-stone-200 divide-y divide-stone-200/50 overflow-hidden mb-4">
            {editingEnvelopes.map((env, idx) => (
              <div key={env.id} className="py-4 px-5 relative hover:bg-stone-50 transition-colors group">
                <div className="grid grid-cols-2 gap-4 pr-8">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-stone-500 mb-1">Name</label>
                    <input 
                      className="w-full bg-transparent border-none p-0 text-stone-900 font-bold focus:ring-0"
                      value={env.name}
                      onChange={(e) => {
                        const newEnvs = [...editingEnvelopes];
                        newEnvs[idx].name = e.target.value;
                        setEditingEnvelopes(newEnvs);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-stone-500 mb-1">Monthly Budget($)</label>
                    <input
                      type="number"
                      className="w-full bg-transparent border-none p-0 text-stone-900 font-mono font-bold focus:ring-0"
                      value={env.defaultAlloc}
                      onChange={(e) => {
                        const newEnvs = [...editingEnvelopes];
                        newEnvs[idx].defaultAlloc = parseFloat(e.target.value) || 0;
                        setEditingEnvelopes(newEnvs);
                      }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setEditingEnvelopes(editingEnvelopes.filter(e => e.id !== env.id));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Envelope"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              const newEnv: Envelope = {
                id: Date.now().toString(),
                name: 'New Category',
                allocated: 0,
                spent: 0,
                color: 'bg-emerald-800',
                defaultAlloc: 0
              };
              setEditingEnvelopes([...editingEnvelopes, newEnv]);
            }}
            className="w-full py-4 rounded-[20px] border-2 border-dashed border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300 transition-all flex items-center justify-center gap-2 text-sm font-bold"
          >
            <Plus size={16} /> Add Envelope
          </button>
        </div>

        <button
          onClick={handleSaveEnvelopes}
          disabled={isSaving}
          className="mt-6 w-full bg-blue-700 text-white font-black py-5 rounded-[20px] hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Syncing...
            </>
          ) : (
            'Apply Changes to Cloud'
          )}
        </button>
      </div>
    </div>
  );
};
