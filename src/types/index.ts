export interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  defaultAlloc: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  merchant: string;
  notes: string;
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  personalImpact: number;
  spouseOwed: number;
  date: string;
  splitType: 'personal' | '50/50' | 'custom';
}

export interface DateMetrics {
  daysInMonth: number;
  currentDay: number;
  daysLeft: number;
  monthProgress: number;
  currentMonth: number;
  currentYear: number;
}



export interface EnvelopeStat extends Envelope {
  monthSpent: number;
  available: number;
  isAhead: boolean;
  pacingDiff: number;
  monthPacePercent: number;
  daysBehind?: number;
}

export interface Totals {
  remaining: number;
  totalSpentThisMonth: number;
  envelopeStats: EnvelopeStat[];
}

export const DEFAULT_ENVELOPES: Omit<Envelope, 'id'>[] = [
  { name: 'Groceries', allocated: 400, spent: 0, color: 'bg-blue-700', defaultAlloc: 400 },
  { name: 'Dining Out', allocated: 300, spent: 0, color: 'bg-emerald-700', defaultAlloc: 300 },
  { name: 'Fun', allocated: 300, spent: 0, color: 'bg-teal-800', defaultAlloc: 300 }
];
