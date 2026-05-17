import os

def update_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if content != new_content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f'Updated: {path}')

# EnvelopeList.tsx
update_file('./src/components/EnvelopeList.tsx', {
    'env.available.toFixed(0)': 'env.available.toLocaleString(\'en-US\', {maximumFractionDigits:0})',
    'env.pacingDiff.toFixed(2)': 'Math.round(env.pacingDiff).toLocaleString()',
    'env.monthSpent.toFixed(0)': 'env.monthSpent.toLocaleString(\'en-US\', {maximumFractionDigits:0})',
    '${env.defaultAlloc}': '${env.defaultAlloc.toLocaleString()}'
})

# TransactionHistory.tsx
# First fix the line that was deleted by the AI tool
with open('./src/components/TransactionHistory.tsx', 'r') as f:
    content = f.read()
    if 't.personalImpact' not in content:
        # Restore the line
        content = content.replace('<div>\n                  <p className="text-[9px]', '<div>\n                  <p className="font-mono font-black text-sm text-stone-900">-${t.personalImpact.toLocaleString(\'en-US\', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>\n                  <p className="text-[9px]')
        with open('./src/components/TransactionHistory.tsx', 'w') as f:
            f.write(content)
        print('Restored TransactionHistory.tsx')

# FundingModal.tsx
update_file('./src/components/Modals/FundingModal.tsx', {
    "import { Loader2 } from 'lucide-react';": "import { Loader2, X } from 'lucide-react';",
    '<h2 className="text-xl font-bold mb-4 text-stone-900">Add Monthly Funds</h2>': '<div className="flex justify-between items-center mb-4">\n          <h2 className="text-xl font-bold text-stone-900">Add Monthly Funds</h2>\n          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 transition-colors"><X size={24} /></button>\n        </div>',
    '.toFixed(2)': ".toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})"
})

