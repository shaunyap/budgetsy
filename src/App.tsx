import { useState } from 'react';
import { Plus, Loader2, LogIn, Wallet } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useBudget } from './hooks/useBudget';
import { Header } from './components/Header';
import { BudgetStats } from './components/BudgetStats';
import { EnvelopeList } from './components/EnvelopeList';
import { TransactionHistory } from './components/TransactionHistory';
import { AddTransactionModal } from './components/Modals/AddTransactionModal';
import { EditTransactionModal } from './components/Modals/EditTransactionModal';
import { ManageEnvelopesModal } from './components/Modals/ManageEnvelopesModal';
import { FundingModal } from './components/Modals/FundingModal';

const App = () => {
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { envelopes, transactions, loading: budgetLoading, dateMetrics, totals } = useBudget(user);

  // Filter states
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto" />
          <p className="text-stone-500 font-bold text-xs uppercase tracking-widest text-center">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="w-20 h-20 bg-blue-700/10 rounded-[20px] flex items-center justify-center mx-auto mb-6 border border-blue-700/20">
              <Wallet className="text-blue-700" size={40} />
            </div>
            <h1 className="text-4xl font-black text-stone-900 tracking-tight">Budgetsy</h1>
            <p className="text-stone-500 font-medium">Manage your finances.</p>
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 font-black py-5 rounded-[20px] hover:bg-zinc-100 transition-all shadow-xl active:scale-95 text-lg uppercase tracking-widest"
          >
            <LogIn size={24} />
            Sign in with Google
          </button>

          <p className="text-[10px] text-stone-400 uppercase font-black tracking-[0.2em]">Secure Cloud Sync Enabled</p>
        </div>
      </div>
    );
  }

  if (budgetLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto" />
          <p className="text-stone-500 font-bold text-xs uppercase tracking-widest text-center">Syncing with cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans pb-32 selection:bg-blue-700/30 overflow-x-hidden">
      <header className="max-w-2xl mx-auto pt-12 px-6 space-y-6">
        <Header
          onOpenEdit={() => setIsEditModalOpen(true)}
          onOpenFunding={() => setIsFundingModalOpen(true)}
          onLogout={logout}
        />

        <BudgetStats
          totals={totals}
          dateMetrics={dateMetrics}
        />

        <EnvelopeList
          envelopeStats={totals.envelopeStats}
          dateMetrics={dateMetrics}
          selectedId={selectedEnvelopeId}
          onSelect={(id) => setSelectedEnvelopeId(id === selectedEnvelopeId ? null : id)}
        />

        <TransactionHistory
          transactions={transactions}
          selectedEnvelopeId={selectedEnvelopeId}
          onClearFilter={() => setSelectedEnvelopeId(null)}
          onEditTransaction={(t) => setEditingTransaction(t)}
        />
      </header>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-blue-700 text-white rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modals */}
      <AddTransactionModal
        user={user}
        envelopes={envelopes}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ManageEnvelopesModal
        user={user}
        envelopes={envelopes}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <EditTransactionModal
        user={user}
        envelopes={envelopes}
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      <FundingModal
        user={user}
        envelopes={envelopes}
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
      />
    </div>
  );
};

export default App;
