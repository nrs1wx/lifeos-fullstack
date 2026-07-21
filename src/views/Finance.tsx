import React, { useMemo, useState } from 'react';
import { Download, TrendingUp, ArrowDownRight, ArrowUpRight, BarChart3, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const defaultExpenseCategories = ['Dining', 'Groceries', 'Transport', 'Personal', 'Entertainment', 'Housing', 'Health'];
const defaultIncomeCategories = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other Income'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateFromMonthKey(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function txAmount(tx: any) {
  const value = Number(tx.amount || 0);
  return Number.isFinite(value) ? value : 0;
}

function txDate(tx: any) {
  const date = new Date(tx.date);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
}

function txName(tx: any) {
  return tx.name || tx.category || 'Transaction';
}

function txCategory(tx: any) {
  return tx.category || tx.name || 'Other';
}

function isIncome(tx: any) {
  return tx.type === 'income' || txAmount(tx) < 0;
}

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Finance() {
  const { finances, addActivity, addToast, addEntity, deleteEntity, currency } = useStore();
  const money = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  const [newAmount, setNewAmount] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [newCategory, setNewCategory] = useState('Dining');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const now = new Date();
  const selectedMonthDate = dateFromMonthKey(selectedMonth);
  const monthlyTransactions = useMemo(() => finances.filter((tx: any) => {
    const date = txDate(tx);
    return date.getFullYear() === selectedMonthDate.getFullYear() && date.getMonth() === selectedMonthDate.getMonth();
  }), [finances, selectedMonthDate]);

  const allCategories = useMemo(() => {
    const values = new Set<string>([...defaultExpenseCategories, ...defaultIncomeCategories]);
    finances.forEach((tx: any) => values.add(txCategory(tx)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [finances]);

  const visibleTransactions = useMemo(() => monthlyTransactions
    .filter((tx: any) => filterType === 'all' || (filterType === 'income' ? isIncome(tx) : !isIncome(tx)))
    .filter((tx: any) => filterCategory === 'all' || txCategory(tx) === filterCategory)
    .sort((a: any, b: any) => txDate(b).getTime() - txDate(a).getTime()), [monthlyTransactions, filterType, filterCategory]);

  const totalIncome = monthlyTransactions
    .filter(isIncome)
    .reduce((sum: number, tx: any) => sum + Math.abs(txAmount(tx)), 0);
  const totalExpenses = monthlyTransactions
    .filter((tx: any) => !isIncome(tx))
    .reduce((sum: number, tx: any) => sum + Math.abs(txAmount(tx)), 0);
  const netCashFlow = totalIncome - totalExpenses;

  const cashFlowTrend = useMemo(() => {
    let balance = 0;
    const isCurrentMonth = selectedMonthDate.getFullYear() === now.getFullYear() && selectedMonthDate.getMonth() === now.getMonth();
    const dayCount = isCurrentMonth
      ? now.getDate()
      : new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), index + 1);
      const dayTransactions = monthlyTransactions.filter((tx: any) => sameLocalDay(txDate(tx), date));
      const income = dayTransactions.filter(isIncome).reduce((sum: number, tx: any) => sum + Math.abs(txAmount(tx)), 0);
      const expenses = dayTransactions.filter((tx: any) => !isIncome(tx)).reduce((sum: number, tx: any) => sum + Math.abs(txAmount(tx)), 0);
      const net = income - expenses;
      balance += net;
      return {
        date,
        label: String(index + 1),
        income,
        expenses,
        net,
        balance,
      };
    });
  }, [monthlyTransactions, selectedMonthDate, now]);

  const hasFinanceData = monthlyTransactions.length > 0;
  const averageDailyExpense = now.getDate() > 0 ? totalExpenses / now.getDate() : 0;
  const daysInSelectedMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
  const isCurrentMonth = selectedMonthDate.getFullYear() === now.getFullYear() && selectedMonthDate.getMonth() === now.getMonth();
  const projectedExpenses = isCurrentMonth ? averageDailyExpense * daysInSelectedMonth : totalExpenses;
  const projectedNet = totalIncome - projectedExpenses;

  const categories = useMemo(() => {
    const grouped = new Map<string, number>();
    monthlyTransactions.filter((tx: any) => !isIncome(tx)).forEach((tx: any) => {
      const category = txCategory(tx);
      grouped.set(category, (grouped.get(category) || 0) + Math.abs(txAmount(tx)));
    });
    return Array.from(grouped.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        share: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions, totalExpenses]);

  const handleSync = () => {
    if (monthlyTransactions.length === 0) {
      setAnalysis('Add transactions to generate an overview from your own data.');
    } else {
      const topCategory = categories[0];
      const insight = topCategory
        ? `${topCategory.name} is your largest expense category this month at ${money.format(topCategory.amount)}. Net cash flow is ${money.format(netCashFlow)}.`
        : `Net cash flow this month is ${money.format(netCashFlow)}.`;
      setAnalysis(insight);
    }
    addActivity('Analyzed finance data', 'Finance');
    addToast('Finance analysis updated');
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.abs(parseFloat(newAmount));
    if (!Number.isFinite(amount) || amount <= 0) return;
    
    const newTx = {
      id: Math.random().toString(36).substring(2, 9),
      name: newName.trim() || newCategory,
      category: newCategory,
      amount,
      date: newDate,
      type: newType,
    };
    addEntity('finances', newTx);
    
    addActivity(`Added ${newType}: ${money.format(amount)} for ${newCategory}`, 'Finance');
    addToast(`${newType === 'income' ? 'Income' : 'Expense'} added successfully`);
    setNewAmount('');
    setNewName('');
  };

  const handleExport = () => {
    const header = ['date', 'type', 'category', 'name', 'amount'];
    const rows = visibleTransactions.map((tx: any) => [
      txDate(tx).toISOString().split('T')[0],
      isIncome(tx) ? 'income' : 'expense',
      txCategory(tx),
      txName(tx),
      String(Math.abs(txAmount(tx))),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifeos-finance-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addActivity('Exported finance CSV', 'Finance');
    addToast('Finance CSV exported');
  };

  const handleDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteEntity('finances', transactionToDelete);
      addActivity('Deleted transaction', 'Finance');
      addToast('Transaction deleted');
      setTransactionToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />
      
      <div className="p-4 lg:p-10 max-w-[1280px] mx-auto w-full flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end shrink-0 gap-4">
          <div>
            <h2 className="text-[32px] font-heading font-bold text-on-surface">Finance</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">{monthFormatter.format(selectedMonthDate)} Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSync}
              className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg font-medium text-[13px] hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              <BarChart3 className="w-4 h-4" /> 
              Analyze
            </button>
            <button onClick={handleExport} className="hidden lg:flex items-center gap-2 px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-lg font-mono text-[11.5px] hover:bg-surface-variant shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface border border-outline-variant rounded-xl p-4 shadow-sm">
          <div>
            <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary">
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary">
              <option value="all">All categories</option>
              {allCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
        </section>

        {analysis && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-6 shadow-sm flex gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center text-on-primary shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-heading font-semibold text-on-surface mb-1">Financial Overview</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">{analysis}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">Net Cash Flow</p>
                  <h3 className="text-[40px] lg:text-[48px] font-heading font-extrabold text-on-surface mt-2">{money.format(netCashFlow)}</h3>
                </div>
                <div className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-mono text-[11.5px] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> {visibleTransactions.length} tx
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/50">
                  <p className="text-[12px] text-on-surface-variant mb-1 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-secondary" /> Income
                  </p>
                  <p className="text-[24px] font-heading font-semibold text-on-surface">{money.format(totalIncome)}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/50">
                  <p className="text-[12px] text-on-surface-variant mb-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-error" /> Expenses
                  </p>
                  <p className="text-[24px] font-heading font-semibold text-on-surface">{money.format(totalExpenses)}</p>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/50 mb-8">
                <p className="text-[12px] text-on-surface-variant mb-1">Month-end forecast</p>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  <p className="text-[24px] font-heading font-semibold text-on-surface">{money.format(projectedNet)}</p>
                  <p className="text-[12px] text-on-surface-variant">
                    Projected expenses: {money.format(projectedExpenses)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[11.5px] text-on-surface-variant mb-2">
                <span>Expense Share</span>
                <span>{totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% of income` : 'No income recorded'}</span>
              </div>
              <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalIncome > 0 ? Math.min(100, Math.round((totalExpenses / totalIncome) * 100)) : 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="text-[16px] font-semibold text-on-surface mb-4">Quick Transaction</h3>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4 flex-1 justify-center">
              <div className="grid grid-cols-2 gap-2 bg-surface-container-low rounded-xl p-1 border border-outline-variant">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setNewType(type);
                      setNewCategory(type === 'income' ? 'Salary' : 'Dining');
                    }}
                    className={`rounded-lg px-3 py-2 text-[12px] font-semibold ${newType === type ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {type === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={newType === 'income' ? 'Monthly salary' : 'Coffee, groceries...'}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-8 pr-4 py-3 text-[16px] font-medium text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Category</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface outline-none focus:border-primary appearance-none"
                >
                  {(newType === 'income' ? defaultIncomeCategories : defaultExpenseCategories).map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-[14px] text-on-surface outline-none focus:border-primary"
                />
              </div>
              <button disabled={!newAmount} className="mt-2 w-full bg-primary text-on-primary py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" /> Add {newType === 'income' ? 'Income' : 'Expense'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-[24px] font-heading font-semibold text-on-surface">Cash Flow Trend</h3>
                <p className="text-[13px] text-on-surface-variant mt-1">Real month-to-date income, expenses, and running balance.</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full font-mono text-[11.5px] font-semibold ${netCashFlow >= 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                {netCashFlow >= 0 ? '+' : ''}{money.format(netCashFlow)}
              </div>
            </div>
            <div className="h-72 w-full">
              {!hasFinanceData ? (
                <div className="h-full flex items-center justify-center text-[14px] text-on-surface-variant text-center">
                  Add income and expenses to draw a real cash-flow chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowTrend} margin={{ top: 10, right: 14, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #e2e8f0)" opacity={0.65} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #64748b)', fontFamily: 'var(--font-mono)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #64748b)', fontFamily: 'var(--font-mono)' }} tickFormatter={(val) => money.format(Number(val)).replace(/\D00(?=\D*$)/, '')} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-surface-container-low, #f1f5f9)' }}
                      contentStyle={{ backgroundColor: 'var(--color-surface, #fff)', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)', color: 'var(--color-on-surface)' }}
                      labelFormatter={(label) => `${monthFormatter.format(selectedMonthDate)} ${label}`}
                      formatter={(value, name) => [money.format(Number(value)), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }} />
                    <ReferenceLine y={0} stroke="var(--color-outline)" strokeOpacity={0.7} />
                    <Bar dataKey="income" name="Income" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} opacity={0.75} />
                    <Bar dataKey="expenses" name="Expenses" fill="var(--color-error)" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Line type="monotone" dataKey="balance" name="Balance" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="net" name="Daily net" stroke="var(--color-tertiary)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col h-[340px]">
             <h3 className="text-[24px] font-heading font-semibold text-on-surface mb-4">Top Categories</h3>
             <div className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-[13px] text-on-surface-variant text-center mt-10">No spending categories yet.</p>
              ) : categories.map((category) => (
                <div key={category.name}>
                  <div className="flex justify-between items-center gap-3 mb-1">
                    <span className="text-[13px] font-medium text-on-surface truncate">{category.name}</span>
                    <span className="font-mono text-[12px] text-on-surface-variant shrink-0">{money.format(category.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${category.share}%` }} />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-on-surface-variant">{category.share}% of expenses</p>
                </div>
              ))}
             </div>
          </div>

          <div className="lg:col-span-3 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col h-[340px]">
             <h3 className="text-[24px] font-heading font-semibold text-on-surface mb-4">Transactions</h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {visibleTransactions.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant text-center mt-10">No transactions yet.</p>
                ) : (
                  visibleTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                      <div>
                        <p className="text-[14px] font-medium text-on-surface">{txName(tx)}</p>
                        <p className="text-[11px] text-on-surface-variant">{txDate(tx).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-[13px] font-medium ${isIncome(tx) ? 'text-secondary' : 'text-error'}`}>
                          {isIncome(tx) ? '+' : '-'}{money.format(Math.abs(txAmount(tx)))}
                        </span>
                        <button aria-label="Delete" 
                          onClick={() => setTransactionToDelete(tx.id)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!transactionToDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
}
