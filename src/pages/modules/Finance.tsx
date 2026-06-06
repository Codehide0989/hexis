import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Filter, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../context/PlanContext';
import { UpgradeGate } from '../../components/ui/UpgradeGate';
import { toast } from 'react-hot-toast';

type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at?: string;
}

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Other'];

export default function Finance() {
  const { user } = useAuth();
  const { canUse } = usePlan();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Currency State
  const [currency, setCurrency] = useState<'USD' | 'INR'>(() => 
    (localStorage.getItem('hexis_currency') as 'USD' | 'INR') || 'INR'
  );

  const changeCurrency = (c: 'USD' | 'INR') => {
    setCurrency(c);
    localStorage.setItem('hexis_currency', c);
  };

  const sym = currency === 'INR' ? '₹' : '$';



  useEffect(() => {
    if (!user?.id) return;
    
    fetchTransactions();
    
    const channel = supabase
      .channel('module-transactions-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTransactions();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);

  useEffect(() => {
    // Reset category if switching types and current category isn't valid
    if (formData.type === 'expense' && !EXPENSE_CATEGORIES.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: EXPENSE_CATEGORIES[0] }));
    } else if (formData.type === 'income' && !INCOME_CATEGORIES.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: INCOME_CATEGORIES[0] }));
    }
  }, [formData.type]);

  const fetchTransactions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Finance fetch:', err.message);
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('ENTER VALID AMOUNT');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || '',
          date: formData.date || new Date().toISOString().split('T')[0],
          payment_method: 'cash'
        });
      
      if (error) throw error;
      
      toast.success('TRANSACTION RECORDED');
      setShowModal(false);
      setFormData({
        type: 'expense',
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (err: any) {
      toast.error('FAILED: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Date,Type,Category,Description,Amount'];
    const rows = transactions.map(t => 
      `${t.date},${t.type},"${t.category}","${t.description.replace(/"/g, '""')}",${t.amount}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV');
  };

  // Derived state
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory]);

  const { totalIncome, totalExpense, netBalance, thisMonthBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    
    const currentMonth = new Date().toISOString().slice(0, 7);

    transactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        income += amt;
        if (t.date.startsWith(currentMonth)) monthIncome += amt;
      } else {
        expense += amt;
        if (t.date.startsWith(currentMonth)) monthExpense += amt;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      thisMonthBalance: monthIncome - monthExpense
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const monthlyMap: Record<string, { income: number, expense: number }> = {};
    
    transactions.forEach(t => {
      const month = t.date.slice(0, 7); // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = { income: 0, expense: 0 };
      }
      monthlyMap[month][t.type] += Number(t.amount);
    });

    return Object.entries(monthlyMap)
      .map(([month, data]) => ({ name: month, Income: data.income, Expense: data.expense }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-6); // last 6 months
  }, [transactions]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  return (
    <UpgradeGate feature="Finance" requiredPlan="phantom" enabled={canUse('finance')}>
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-mono text-[#52b788] uppercase tracking-wider mb-2">FINANCE TRACKER</h1>
          <p className="text-[#95d5b2] font-mono text-sm uppercase">Monitor revenue streams & burn rate</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 border border-[#1b4332]">
            <button 
              onClick={() => changeCurrency('INR')}
              className={`px-2 md:px-3 py-1.5 font-mono text-xs transition-colors ${
                currency === 'INR' ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788]'
              }`}>
              ₹ INR
            </button>
            <button 
              onClick={() => changeCurrency('USD')}
              className={`px-2 md:px-3 py-1.5 font-mono text-xs transition-colors ${
                currency === 'USD' ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788]'
              }`}>
              $ USD
            </button>
          </div>
          <button onClick={exportToCSV} className="hex-btn-outline flex items-center gap-2 text-xs px-3 py-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => setShowModal(true)} className="hex-btn-primary flex items-center justify-center gap-2 text-xs px-3 py-2 whitespace-nowrap">
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-[#e63946] bg-[#0d2818] text-[#e63946] font-mono text-sm">
          &gt; ERROR: {error}
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="hex-card">
          <div className="flex items-center gap-2 text-[#95d5b2] font-mono text-xs uppercase mb-2">
            <TrendingUp size={14} className="text-[#52b788]" /> Total Income
          </div>
          <div className="text-2xl font-mono text-[#d8f3dc]">{sym}{totalIncome.toFixed(2)}</div>
        </div>
        <div className="hex-card">
          <div className="flex items-center gap-2 text-[#95d5b2] font-mono text-xs uppercase mb-2">
            <TrendingDown size={14} className="text-[#e63946]" /> Total Expenses
          </div>
          <div className="text-2xl font-mono text-[#d8f3dc]">{sym}{totalExpense.toFixed(2)}</div>
        </div>
        <div className="hex-card border-[#52b788]">
          <div className="flex items-center gap-2 text-[#95d5b2] font-mono text-xs uppercase mb-2">
            <DollarSign size={14} /> Net Balance
          </div>
          <div className={`text-2xl font-mono ${netBalance >= 0 ? 'text-[#52b788]' : 'text-[#e63946]'}`}>
            {netBalance < 0 ? '-' : ''}{sym}{Math.abs(netBalance).toFixed(2)}
          </div>
        </div>
        <div className="hex-card">
          <div className="flex items-center gap-2 text-[#95d5b2] font-mono text-xs uppercase mb-2">
            <Calendar size={14} /> This Month Net
          </div>
          <div className={`text-2xl font-mono ${thisMonthBalance >= 0 ? 'text-[#52b788]' : 'text-[#e63946]'}`}>
            {thisMonthBalance < 0 ? '-' : ''}{sym}{Math.abs(thisMonthBalance).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart & Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 hex-card h-56 md:h-80 flex flex-col">
          <h2 className="text-[#52b788] font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> 6-Month Trajectory
          </h2>
          <div className="flex-1 min-h-0 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b4332" vertical={false} />
                  <XAxis dataKey="name" stroke="#95d5b2" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#95d5b2" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${sym}${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d2818', borderColor: '#1b4332', color: '#d8f3dc' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                  <Bar dataKey="Income" fill="#52b788" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#e63946" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#1b4332] font-mono uppercase text-sm">
                [ INSUFFICIENT DATA ]
              </div>
            )}
          </div>
        </div>

        <div className="hex-card flex flex-col">
          <h2 className="text-[#52b788] font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Filter size={16} /> Filter Records
          </h2>
          <div className="space-y-4">
            <div>
              <label className="hex-label">Type</label>
              <select 
                className="hex-input"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any);
                  setFilterCategory('all');
                }}
              >
                <option value="all">ALL TYPES</option>
                <option value="income">INCOME</option>
                <option value="expense">EXPENSE</option>
              </select>
            </div>
            <div>
              <label className="hex-label">Category</label>
              <select 
                className="hex-input"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">ALL CATEGORIES</option>
                {allCategories.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="hex-card flex-1">
        <h2 className="text-[#52b788] font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
          <FileText size={16} /> Ledger
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-[#95d5b2] font-mono text-sm uppercase animate-pulse">Loading records...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-[#1b4332] font-mono text-sm uppercase">[ NO RECORDS FOUND ]</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1b4332]">
                  <th className="py-3 px-4 font-mono text-xs uppercase text-[#95d5b2]">Date</th>
                  <th className="py-3 px-4 font-mono text-xs uppercase text-[#95d5b2]">Type</th>
                  <th className="py-3 px-4 font-mono text-xs uppercase text-[#95d5b2]">Category</th>
                  <th className="py-3 px-4 font-mono text-xs uppercase text-[#95d5b2]">Description</th>
                  <th className="py-3 px-4 font-mono text-xs uppercase text-[#95d5b2] text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="border-b border-[#1b4332] hover:bg-[#1b4332]/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm text-[#d8f3dc]">{tx.date}</td>
                    <td className="py-3 px-4">
                      <span className={`hex-badge ${tx.type === 'income' ? 'text-[#52b788] border-[#52b788]' : 'text-[#e63946] border-[#e63946]'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-[#95d5b2] flex items-center gap-2">
                      <Tag size={12} /> {tx.category}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#d8f3dc]">{tx.description}</td>
                    <td className={`py-3 px-4 font-mono text-sm text-right font-bold ${tx.type === 'income' ? 'text-[#52b788]' : 'text-[#e63946]'}`}>
                      {tx.type === 'income' ? '+' : '-'}{sym}{Number(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0a1a0f]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="hex-card w-full max-w-md relative mx-3 md:mx-0 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#95d5b2] hover:text-[#52b788]"
            >
              ✕
            </button>
            <h2 className="text-[#52b788] font-mono text-xl uppercase tracking-widest mb-6 border-b border-[#1b4332] pb-2">
              [ NEW RECORD ]
            </h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex gap-2 md:gap-4">
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    value="expense"
                    className="hidden peer"
                    checked={formData.type === 'expense'}
                    onChange={() => setFormData({...formData, type: 'expense'})}
                  />
                  <div className="text-center py-2 border border-[#1b4332] text-[#95d5b2] font-mono text-sm uppercase peer-checked:bg-[#e63946] peer-checked:text-white peer-checked:border-[#e63946] transition-colors">
                    Expense
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    value="income"
                    className="hidden peer"
                    checked={formData.type === 'income'}
                    onChange={() => setFormData({...formData, type: 'income'})}
                  />
                  <div className="text-center py-2 border border-[#1b4332] text-[#95d5b2] font-mono text-sm uppercase peer-checked:bg-[#52b788] peer-checked:text-[#0a1a0f] peer-checked:border-[#52b788] transition-colors">
                    Income
                  </div>
                </label>
              </div>

              <div>
                <label className="hex-label">Amount</label>
                <div className="flex items-center border border-[#1b4332] focus-within:border-[#52b788] transition-colors">
                  <span className="px-3 font-mono text-sm text-[#52b788] bg-[#0a1a0f] py-3 border-r border-[#1b4332]">
                    {sym}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="flex-1 bg-[#0a1a0f] text-[#d8f3dc] font-mono text-sm px-3 py-3 outline-none placeholder-[#2d6a4f]"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="hex-label">Category</label>
                <select 
                  className="hex-input"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                    <option className="bg-[#0d2818] text-[#d8f3dc]" key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="hex-label">Description</label>
                <input
                  type="text"
                  required
                  className="hex-input"
                  placeholder="e.g., Groceries"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="hex-label">Date</label>
                <input
                  type="date"
                  required
                  className="hex-input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <button disabled={submitting} type="submit" className="hex-btn-primary w-full mt-6 flex items-center justify-center">
                {submitting ? 'COMMITTING...' : 'Commit Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </UpgradeGate>
  );
}
