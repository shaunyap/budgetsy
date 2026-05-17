import os

path = './src/components/TransactionHistory.tsx'
with open(path, 'r') as f:
    content = f.read()

# Restore the deleted line and change items-start to items-center
bad_chunk = """          filteredTransactions.map(t => (

              <div className="flex items-center gap-3">"""

good_chunk = """          filteredTransactions.map(t => (
            <div key={t.id} className="py-3 px-5 flex items-center justify-between hover:bg-white/70 transition-colors group relative">
              <div className="flex items-center gap-3">"""

content = content.replace(bad_chunk, good_chunk)

with open(path, 'w') as f:
    f.write(content)
print("Restored and fixed TransactionHistory.tsx")
