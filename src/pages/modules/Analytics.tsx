import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useRealtimeData } from '../../hooks/useRealtimeData'
import { 
  BarChart2, TrendingUp, CheckSquare, 
  Calendar, Target, Activity, FileText, Bell, Layout, Wallet
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts'
import { usePlan } from '../../context/PlanContext'
import { UpgradeGate } from '../../components/ui/UpgradeGate'

export default function Analytics() {
  const { user } = useAuth()
  const { canUse } = usePlan()
  const { stats, loading, refetch, lastUpdated } = useRealtimeData()
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  
  const [activityMap, setActivityMap] = useState<Record<string, number>>({})
  const [streakStats, setStreakStats] = useState({ current: 0, longest: 0, bestDay: 'N/A', total: 0 })
  
  useEffect(() => {
    if (!user?.id) return
    fetchMonthlyData()
    fetchHeatmapData()
    
    const channel = supabase.channel('analytics-realtime-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_cards', filter: `user_id=eq.${user.id}` }, () => { fetchMonthlyData(); fetchHeatmapData(); })
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, [user?.id, lastUpdated])
  
  const refetchAll = () => {
    refetch()
    fetchMonthlyData()
    fetchHeatmapData()
  }

  const fetchMonthlyData = async () => {
    if (!user?.id) return
    try {
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        
        const [tasksRes, todosRes, txRes] = await Promise.allSettled([
          supabase.from('tasks')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end),
          supabase.from('todos')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end),
          supabase.from('transactions')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end),
        ])
        
        months.push({
          month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase(),
          tasks: tasksRes.status === 'fulfilled' ? (tasksRes.value.count || 0) : 0,
          todos: todosRes.status === 'fulfilled' ? (todosRes.value.count || 0) : 0,
          transactions: txRes.status === 'fulfilled' ? (txRes.value.count || 0) : 0,
        })
      }
      setMonthlyData(months)
    } catch (err) {
      console.error('Monthly data error:', err)
    }
  }

  const fetchHeatmapData = async () => {
    if (!user?.id) return
    try {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 365)
      const start = pastDate.toISOString()

      const [tasksRes, todosRes, docsRes, invRes, txRes, remRes, kanRes] = await Promise.allSettled([
        supabase.from('tasks').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('todos').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('docs').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('invoices').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('transactions').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('reminders').select('created_at').eq('user_id', user.id).gte('created_at', start),
        supabase.from('kanban_cards').select('created_at').eq('user_id', user.id).gte('created_at', start),
      ])

      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data || [] : []
      const todos = todosRes.status === 'fulfilled' ? todosRes.value.data || [] : []
      const docs = docsRes.status === 'fulfilled' ? docsRes.value.data || [] : []
      const invs = invRes.status === 'fulfilled' ? invRes.value.data || [] : []
      const txs = txRes.status === 'fulfilled' ? txRes.value.data || [] : []
      const rems = remRes.status === 'fulfilled' ? remRes.value.data || [] : []
      const kans = kanRes.status === 'fulfilled' ? kanRes.value.data || [] : []

      const allDates = [...tasks, ...todos, ...docs, ...invs, ...txs, ...rems, ...kans].map(item => item.created_at.split('T')[0])
      
      const map: Record<string, number> = {}
      allDates.forEach(date => {
        map[date] = (map[date] || 0) + 1
      })

      setActivityMap(map)

      let lStreak = 0
      let tStreak = 0
      let total = 0
      const dayCounts = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      let cStreak = 0
      
      for (let i = 0; i < 365; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (364 - i))
        const dStr = d.toISOString().split('T')[0]
        
        if (map[dStr]) {
          tStreak++
          lStreak = Math.max(lStreak, tStreak)
          total += map[dStr]
          dayCounts[d.getDay()] += map[dStr]
        } else {
          tStreak = 0
        }
        
        // At today
        if (i === 364) {
          cStreak = tStreak
        }
      }
      
      const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
      const bestDay = Math.max(...dayCounts) > 0 ? days[bestDayIdx] : 'N/A'

      setStreakStats({ current: cStreak, longest: lStreak, bestDay, total })
    } catch (err) {
      console.error(err)
    }
  }

  const generateHeatmapCells = () => {
    const cells = []
    for (let i = 0; i < 364; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (363 - i))
      const dStr = d.toISOString().split('T')[0]
      const count = activityMap[dStr] || 0
      let bg = '#0d2818'
      if (count >= 10) bg = '#52b788'
      else if (count >= 6) bg = '#40916c'
      else if (count >= 3) bg = '#2d6a4f'
      else if (count >= 1) bg = '#1b4332'
      
      cells.push({ date: dStr, count, bg })
    }
    return cells
  }

  const generateMonths = () => {
    const months = []
    let currentMonth = -1
    const cells = generateHeatmapCells()
    for (let i = 0; i < 52; i++) {
      const colStartCell = cells[i * 7]
      if (!colStartCell) break
      const date = new Date(colStartCell.date)
      if (date.getMonth() !== currentMonth) {
        months.push({ text: date.toLocaleString('default', { month: 'short' }).toUpperCase(), col: i })
        currentMonth = date.getMonth()
      }
    }
    return months
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#0d2818] border border-[#52b788] px-3 py-2">
        <p className="font-mono text-xs text-[#52b788] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-mono text-xs text-[#d8f3dc]">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }

  const renderContent = () => {
  if (loading) return (
    <div className="p-6 md:p-8 bg-[#0a1a0f] min-h-full">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-[#0d2818] border border-[#1b4332]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i) => (
            <div key={i} className="h-24 bg-[#0d2818] border border-[#1b4332]"/>
          ))}
        </div>
        <div className="h-64 bg-[#0d2818] border border-[#1b4332]" />
      </div>
    </div>
  )

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.doneTasks / stats.totalTasks) * 100)
    : 0

  const todoRate = stats.totalTodos > 0
    ? Math.round((stats.completedTodos / stats.totalTodos) * 100)
    : 0
    
  const tasksByStatus = [
    { name: 'PENDING', value: stats.pendingTasks, color: '#e9c46a' },
    { name: 'DONE', value: stats.doneTasks, color: '#52b788' }
  ].filter(item => item.value > 0)

  const netBalance = stats.totalIncome - stats.totalExpense
  const currency = localStorage.getItem('hexis_currency') === 'USD' ? '$' : '₹'

  return (
    <div className="p-4 md:p-8 bg-[#0a1a0f] min-h-full font-mono">
      <div className="flex items-center gap-3 mb-8 border-b border-[#1b4332] pb-4">
        <BarChart2 size={32} className="text-[#52b788]" />
        <div>
          <h1 className="font-bold text-2xl text-[#d8f3dc] uppercase tracking-widest">
            SYSTEM_ANALYTICS
          </h1>
          <p className="text-xs text-[#52b788] mt-0.5 tracking-widest">
            PERFORMANCE_REPORT
          </p>
        </div>
        <button
          onClick={refetchAll}
          className="ml-auto px-4 py-2 border border-[#52b788] text-[#52b788] hover:bg-[#52b788] hover:text-[#0a1a0f] transition-colors text-xs flex items-center gap-2 uppercase tracking-widest">
          <Activity size={14} />
          REFRESH
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL TASKS', value: stats.totalTasks, sub: `${stats.doneTasks} COMPLETED`, icon: <CheckSquare size={20} /> },
          { label: 'COMPLETION RATE', value: `${completionRate}%`, sub: 'TASKS DONE', icon: <Target size={20} /> },
          { label: 'TRANSACTIONS', value: stats.totalTransactions, sub: 'FINANCE RECORDS', icon: <TrendingUp size={20} /> },
          { label: 'INVOICES', value: stats.totalInvoices, sub: `${todoRate}% TODOS DONE`, icon: <Calendar size={20} /> },
          
          { label: 'REMINDERS', value: stats.upcomingReminders, sub: 'UPCOMING', icon: <Bell size={20} /> },
          { label: 'DOCS', value: stats.totalDocs || 0, sub: 'TOTAL DOCUMENTS', icon: <FileText size={20} /> },
          { label: 'KANBAN CARDS', value: stats.kanbanCards, sub: 'TOTAL CARDS', icon: <Layout size={20} /> },
          { 
            label: 'NET BALANCE', 
            value: `${currency}${netBalance.toLocaleString('en-IN')}`, 
            sub: 'INCOME - EXPENSE', 
            icon: <Wallet size={20} />, 
            valueClass: netBalance >= 0 ? 'text-[#52b788]' : 'text-[#e63946]' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0d2818] border border-[#1b4332] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#95d5b2] uppercase tracking-widest">
                {stat.label}
              </span>
              <span className="text-[#1b4332] opacity-80">
                {stat.icon}
              </span>
            </div>
            <p className={`font-bold text-3xl mb-1 ${stat.valueClass || 'text-[#52b788]'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-[#1b4332] tracking-widest uppercase">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* STREAK TRACKER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0d2818] border border-[#1b4332] p-5 flex flex-col items-start gap-1 min-w-0 overflow-hidden">
          <span className="text-[10px] text-[#95d5b2] uppercase tracking-widest">CURRENT_STREAK</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#52b788]">{streakStats.current} DAYS</span>
        </div>
        <div className="bg-[#0d2818] border border-[#1b4332] p-5 flex flex-col items-start gap-1 min-w-0 overflow-hidden">
          <span className="text-[10px] text-[#95d5b2] uppercase tracking-widest">LONGEST_STREAK</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#52b788]">{streakStats.longest} DAYS</span>
        </div>
        <div className="bg-[#0d2818] border border-[#1b4332] p-5 flex flex-col items-start gap-1 min-w-0 overflow-hidden">
          <span className="text-[10px] text-[#95d5b2] uppercase tracking-widest">MOST_ACTIVE_DAY</span>
          <span className="text-xl sm:text-3xl font-bold text-[#52b788] uppercase break-words">{streakStats.bestDay}</span>
        </div>
      </div>

      {/* CONTRIBUTION HEATMAP */}
      <div className="bg-[#0d2818] border border-[#1b4332] p-6 mb-8 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <p className="text-xs text-[#52b788] uppercase tracking-widest">
            CONTRIBUTION_GRID
          </p>
          <p className="text-[10px] text-[#95d5b2] uppercase tracking-widest hidden sm:block">
            TOTAL_CONTRIBUTIONS: <span className="text-[#d8f3dc] font-bold">{streakStats.total}</span> (LAST 365 DAYS)
          </p>
        </div>
        
        <div className="flex min-w-[600px]">
          {/* Day labels */}
          <div className="grid gap-[2px] pr-2 mt-[20px]" style={{ gridTemplateRows: 'repeat(7, 12px)' }}>
            <span className="text-[9px] text-transparent leading-none">S</span>
            <span className="text-[9px] text-[#1b4332] leading-none flex items-center h-full">MON</span>
            <span className="text-[9px] text-transparent leading-none">T</span>
            <span className="text-[9px] text-[#1b4332] leading-none flex items-center h-full">WED</span>
            <span className="text-[9px] text-transparent leading-none">T</span>
            <span className="text-[9px] text-[#1b4332] leading-none flex items-center h-full">FRI</span>
            <span className="text-[9px] text-transparent leading-none">S</span>
          </div>
          
          <div className="flex-1 min-w-max">
            {/* Month labels */}
            <div className="relative h-4 mb-1 w-full">
              {generateMonths().map((m, i) => (
                <span key={i} className="absolute text-[9px] text-[#1b4332]" style={{ left: `${m.col * 14}px` }}>
                  {m.text}
                </span>
              ))}
            </div>
            
            {/* Heatmap Grid */}
            <div 
              className="grid gap-[2px]" 
              style={{ 
                gridTemplateColumns: 'repeat(52, 12px)', 
                gridTemplateRows: 'repeat(7, 12px)', 
                gridAutoFlow: 'column' 
              }}
            >
              {generateHeatmapCells().map((cell, i) => (
                <div 
                  key={i} 
                  className="w-[12px] h-[12px] rounded-sm group relative cursor-crosshair transition-colors hover:ring-1 hover:ring-[#52b788] hover:z-10"
                  style={{ backgroundColor: cell.bg }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
                    <div className="bg-black border border-[#52b788] px-2 py-1 text-[10px] text-[#d8f3dc] whitespace-nowrap shadow-xl">
                      <span className="text-[#52b788] mr-1">{cell.date}</span> — {cell.count} activities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#0d2818] border border-[#1b4332] p-6">
          <p className="text-xs text-[#52b788] uppercase tracking-widest mb-6">
            MONTHLY_ACTIVITY
          </p>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                <XAxis dataKey="month" tick={{ fill: '#95d5b2', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={{ stroke: '#1b4332' }} tickLine={false} />
                <YAxis tick={{ fill: '#95d5b2', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasks" fill="#52b788" name="TASKS" radius={[2,2,0,0]} />
                <Bar dataKey="todos" fill="#1b4332" name="TODOS" radius={[2,2,0,0]} />
                <Bar dataKey="transactions" fill="#e9c46a" name="FINANCE" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs text-[#1b4332]">NO_DATA_AVAILABLE</p>
            </div>
          )}
        </div>

        <div className="bg-[#0d2818] border border-[#1b4332] p-6">
          <p className="text-xs text-[#52b788] uppercase tracking-widest mb-6">
            TASK_STATUS
          </p>
          {tasksByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={tasksByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {tasksByStatus.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px] text-[#95d5b2] uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-xs text-[#d8f3dc]">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-xs text-[#1b4332]">NO_TASKS_YET</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'TASK COMPLETION', rate: completionRate, total: stats.totalTasks, done: stats.doneTasks },
          { label: 'TODO COMPLETION', rate: todoRate, total: stats.totalTodos, done: stats.completedTodos },
        ].map((item, i) => (
          <div key={i} className="bg-[#0d2818] border border-[#1b4332] p-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-[#52b788] uppercase tracking-widest">
                {item.label}
              </p>
              <span className="text-sm text-[#d8f3dc]">{item.rate}%</span>
            </div>
            <div className="w-full bg-[#0a1a0f] border border-[#1b4332] h-2 mb-3">
              <div className="h-full bg-[#52b788] transition-all duration-500" style={{ width: `${Math.min(item.rate, 100)}%` }} />
            </div>
            <p className="text-[10px] text-[#95d5b2] uppercase tracking-widest">
              {item.done} OF {item.total} COMPLETED
            </p>
          </div>
        ))}
      </div>
    </div>
  )
  };

  return (
    <UpgradeGate feature="Analytics" requiredPlan="phantom" enabled={canUse('analytics')}>
      {renderContent()}
    </UpgradeGate>
  );
}
