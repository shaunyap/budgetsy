import os

# Fix types/index.ts
with open('./src/types/index.ts', 'r') as f:
    content = f.read()

# Since the tool deleted the block, let's just insert it before Totals if missing
if 'EnvelopeStat' not in content:
    replacement = """export interface EnvelopeStat extends Envelope {
  monthSpent: number;
  available: number;
  isAhead: boolean;
  pacingDiff: number;
  monthPacePercent: number;
  daysBehind?: number;
}

export interface Totals {"""
    content = content.replace("export interface Totals {", replacement)
    with open('./src/types/index.ts', 'w') as f:
        f.write(content)
    print("Fixed types/index.ts")

# Update useBudget.ts
with open('./src/hooks/useBudget.ts', 'r') as f:
    content = f.read()

old_logic = """      const isAhead = monthSpent < expectedSpendAtThisPoint;
      const pacingDiff = Math.abs(monthSpent - expectedSpendAtThisPoint);

      return {"""

new_logic = """      const isAhead = monthSpent < expectedSpendAtThisPoint;
      const pacingDiff = Math.abs(monthSpent - expectedSpendAtThisPoint);
      
      let daysBehind = 0;
      if (!isAhead && monthSpent > 0 && dateMetrics.currentDay > 0) {
        const currentPerDayRate = monthSpent / dateMetrics.currentDay;
        daysBehind = pacingDiff / currentPerDayRate;
      }

      return {
        daysBehind,"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('./src/hooks/useBudget.ts', 'w') as f:
        f.write(content)
    print("Fixed useBudget.ts")


# Update EnvelopeList.tsx
with open('./src/components/EnvelopeList.tsx', 'r') as f:
    content = f.read()

old_banner = """                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${env.isAhead ? 'bg-blue-700/10 text-blue-600' : 'bg-rose-500/10 text-rose-400'}`}>
                    {env.isAhead ? 'Ahead' : 'Behind'} ${Math.round(env.pacingDiff).toLocaleString()}
                  </div>"""

new_banner = """                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${env.isAhead ? 'bg-blue-700/10 text-blue-600' : 'bg-rose-500/10 text-rose-400'}`}>
                    {env.isAhead ? 'Ahead' : 'Behind'} ${Math.round(env.pacingDiff).toLocaleString()}
                    {!env.isAhead && env.daysBehind ? ` (${env.daysBehind.toFixed(1)}d)` : ''}
                  </div>"""

if old_banner in content:
    content = content.replace(old_banner, new_banner)
    with open('./src/components/EnvelopeList.tsx', 'w') as f:
        f.write(content)
    print("Fixed EnvelopeList.tsx")

