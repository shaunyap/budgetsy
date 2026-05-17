import os

path = './src/components/TransactionHistory.tsx'
with open(path, 'r') as f:
    content = f.read()

# The tool deleted the <div> opening and date completely.
# Let's restore the right side of the transaction item.
bad_chunk = """              <div className="text-right flex items-center gap-4">
                  {t.splitType !== 'personal' && ("""

good_chunk = """              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="font-mono font-black text-sm text-stone-900">-${t.personalImpact.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase mt-1">{t.date}</p>
                  {t.splitType !== 'personal' && ("""

content = content.replace(bad_chunk, good_chunk)

with open(path, 'w') as f:
    f.write(content)
print("Restored TransactionHistory.tsx")
