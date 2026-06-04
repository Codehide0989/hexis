import { useRealtimeData } from '../../hooks/useRealtimeData'
import { useNavigate } from 'react-router-dom'
import { 
  CheckSquare, Layout, FileText, TrendingUp,
  Bell, List, Plus, ArrowRight, Activity,
  Zap, Clock, Target
} from 'lucide-react'

export default function Overview() {
  const { stats, loading } = useRealtimeData()
  const navigate = useNavigate()
  const currency = localStorage.getItem('hexis_currency') === 'USD' ? '$' : '₹'

  // Activity type config
  const activityConfig: Record<string, {
    prefix: string
    color: string
  }> = {
    task: { prefix: '[TASK]', color: '#52b788' },
    todo: { prefix: '[TODO]', color: '#95d5b2' },
    invoice: { prefix: '[INVOICE]', color: '#e9c46a' },
    reminder: { prefix: '[REMINDER]', color: '#74c69d' },
    doc: { prefix: '[DOC]', color: '#52b788' },
    transaction: { prefix: '[FINANCE]', color: '#e9c46a' },
    kanban: { prefix: '[KANBAN]', color: '#95d5b2' },
    vault: { prefix: '[VAULT]', color: '#52b788' },
  }

  if (loading) return (
    <div className="p-4 md:p-8 bg-[#0a1a0f] min-h-full">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#0d2818] border border-[#1b4332]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="h-28 bg-[#0d2818] border border-[#1b4332]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-[#0d2818] border border-[#1b4332]"/>
          <div className="h-64 bg-[#0d2818] border border-[#1b4332]"/>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 bg-[#0a1a0f] min-h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#52b788]">&gt;</span>
            <h1 className="font-mono font-bold text-xl md:text-2xl text-[#d8f3dc] uppercase tracking-wider">
              OVERVIEW
            </h1>
          </div>
          <p className="font-mono text-xs text-[#52b788] mt-1">
            SYSTEM_DASHBOARD · REALTIME
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 border border-[#1b4332] px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-[#52b788] rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-[#52b788] tracking-widest">
            LIVE SYNC
          </span>
        </div>
      </div>

      {/* Stats Grid — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        
        {/* Total Tasks */}
        <div 
          onClick={() => navigate('/dashboard/tasks')}
          className="bg-[#0d2818] border border-[#1b4332] p-4 md:p-5 hover:border-[#52b788] transition-colors cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] md:text-[10px] text-[#95d5b2] uppercase tracking-widest">
              TOTAL TASKS
            </span>
            <CheckSquare size={14} className="text-[#52b788]" />
          </div>
          <p className="font-mono font-bold text-3xl md:text-4xl text-[#52b788] mb-1 leading-none">
            {stats.totalTasks}
          </p>
          <p className="font-mono text-[9px] text-[#1b4332] tracking-widest mt-2">
            {stats.pendingTasks} PENDING
          </p>
        </div>

        {/* Kanban Cards */}
        <div 
          onClick={() => navigate('/dashboard/kanban')}
          className="bg-[#0d2818] border border-[#1b4332] p-4 md:p-5 hover:border-[#52b788] transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] md:text-[10px] text-[#95d5b2] uppercase tracking-widest">
              KANBAN CARDS
            </span>
            <Layout size={14} className="text-[#52b788]" />
          </div>
          <p className="font-mono font-bold text-3xl md:text-4xl text-[#52b788] mb-1 leading-none">
            {stats.kanbanCards}
          </p>
          <p className="font-mono text-[9px] text-[#1b4332] tracking-widest mt-2">
            ACTIVE CARDS
          </p>
        </div>

        {/* Finance Balance */}
        <div 
          onClick={() => navigate('/dashboard/finance')}
          className="bg-[#0d2818] border border-[#1b4332] p-4 md:p-5 hover:border-[#52b788] transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] md:text-[10px] text-[#95d5b2] uppercase tracking-widest">
              NET BALANCE
            </span>
            <TrendingUp size={14} className="text-[#52b788]" />
          </div>
          <p className={`font-mono font-bold text-2xl md:text-3xl mb-1 leading-none ${(stats.totalIncome - stats.totalExpense) >= 0 ? 'text-[#52b788]' : 'text-[#e63946]'}`}>
            {currency}
            {Math.abs(stats.totalIncome - stats.totalExpense).toLocaleString('en-IN')}
          </p>
          <p className="font-mono text-[9px] text-[#1b4332] tracking-widest mt-2">
            {stats.totalTransactions} RECORDS
          </p>
        </div>

        {/* Reminders */}
        <div 
          onClick={() => navigate('/dashboard/reminders')}
          className="bg-[#0d2818] border border-[#1b4332] p-4 md:p-5 hover:border-[#52b788] transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] md:text-[10px] text-[#95d5b2] uppercase tracking-widest">
              REMINDERS
            </span>
            <Bell size={14} className="text-[#52b788]" />
          </div>
          <p className="font-mono font-bold text-3xl md:text-4xl text-[#52b788] mb-1 leading-none">
            {stats.upcomingReminders}
          </p>
          <p className="font-mono text-[9px] text-[#1b4332] tracking-widest mt-2">
            UPCOMING
          </p>
        </div>
      </div>

      {/* Main content: Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Recent Activity — 2/3 width */}
        <div className="lg:col-span-2 bg-[#0d2818] border border-[#1b4332]">
          
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b4332]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#52b788]" />
              <span className="font-mono text-xs text-[#52b788] uppercase tracking-widest">
                RECENT_ACTIVITY
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#1b4332] border border-[#1b4332] px-2 py-0.5">
              LIVE
            </span>
          </div>
          
          {/* Activity list */}
          <div className="divide-y divide-[#1b4332]">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((item) => {
                const config = activityConfig[item.type] || activityConfig.task
                return (
                  <div key={item.id} className="px-5 py-3 hover:bg-[#0a1a0f] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span 
                          className="font-mono text-[10px] flex-shrink-0 tracking-wider"
                          style={{ color: config.color }}>
                          {config.prefix}
                        </span>
                        <span className="font-mono text-xs text-[#d8f3dc] truncate">
                          {item.action.toUpperCase()}:
                          {' '}{item.title}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#1b4332] flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-12 text-center">
                <Clock size={24} className="text-[#1b4332] mx-auto mb-3" />
                <p className="font-mono text-xs text-[#1b4332] tracking-widest">
                  NO_ACTIVITY_YET
                </p>
                <p className="font-mono text-[10px] text-[#1b4332] mt-1">
                  CREATE A TASK TO GET STARTED
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions — 1/3 width */}
        <div className="bg-[#0d2818] border border-[#1b4332]">
          
          {/* Card header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1b4332]">
            <Zap size={14} className="text-[#52b788]" />
            <span className="font-mono text-xs text-[#52b788] uppercase tracking-widest">
              QUICK_ACTIONS
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="divide-y divide-[#1b4332]">
            {[
              { label: 'NEW TASK', icon: <CheckSquare size={14} />, path: '/dashboard/tasks' },
              { label: 'ADD TODO', icon: <List size={14} />, path: '/dashboard/todos' },
              { label: 'CREATE INVOICE', icon: <FileText size={14} />, path: '/dashboard/invoices' },
              { label: 'KANBAN BOARD', icon: <Layout size={14} />, path: '/dashboard/kanban' },
              { label: 'ADD REMINDER', icon: <Bell size={14} />, path: '/dashboard/reminders' },
              { label: 'NEW DOCUMENT', icon: <FileText size={14} />, path: '/dashboard/docs' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#0a1a0f] hover:text-[#52b788] transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-[#52b788]">
                    {action.icon}
                  </span>
                  <span className="font-mono text-xs text-[#d8f3dc] group-hover:text-[#52b788] uppercase tracking-wider transition-colors">
                    {action.label}
                  </span>
                </div>
                <ArrowRight size={12} className="text-[#1b4332] group-hover:text-[#52b788] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Task progress */}
        <div className="bg-[#0d2818] border border-[#1b4332] p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-[10px] text-[#95d5b2] uppercase tracking-widest">
              TASK PROGRESS
            </span>
            <span className="font-mono text-xs text-[#52b788]">
              {stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0}%
            </span>
          </div>
          <div className="bg-[#0a1a0f] h-1.5 border border-[#1b4332]">
            <div 
              className="h-full bg-[#52b788] transition-all duration-700"
              style={{ width: stats.totalTasks > 0 ? `${(stats.doneTasks / stats.totalTasks) * 100}%` : '0%' }} />
          </div>
          <p className="font-mono text-[9px] text-[#1b4332] mt-2 tracking-widest">
            {stats.doneTasks}/{stats.totalTasks} DONE
          </p>
        </div>

        {/* Todo progress */}
        <div className="bg-[#0d2818] border border-[#1b4332] p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-[10px] text-[#95d5b2] uppercase tracking-widest">
              TODO PROGRESS
            </span>
            <span className="font-mono text-xs text-[#52b788]">
              {stats.totalTodos > 0 ? Math.round((stats.completedTodos / stats.totalTodos) * 100) : 0}%
            </span>
          </div>
          <div className="bg-[#0a1a0f] h-1.5 border border-[#1b4332]">
            <div 
              className="h-full bg-[#52b788] transition-all duration-700"
              style={{ width: stats.totalTodos > 0 ? `${(stats.completedTodos / stats.totalTodos) * 100}%` : '0%' }} />
          </div>
          <p className="font-mono text-[9px] text-[#1b4332] mt-2 tracking-widest">
            {stats.completedTodos}/{stats.totalTodos} DONE
          </p>
        </div>

        {/* Invoice stats */}
        <div className="bg-[#0d2818] border border-[#1b4332] p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-[10px] text-[#95d5b2] uppercase tracking-widest">
              INVOICES PAID
            </span>
            <span className="font-mono text-xs text-[#52b788]">
              {stats.totalInvoices > 0 ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100) : 0}%
            </span>
          </div>
          <div className="bg-[#0a1a0f] h-1.5 border border-[#1b4332]">
            <div 
              className="h-full bg-[#52b788] transition-all duration-700"
              style={{ width: stats.totalInvoices > 0 ? `${(stats.paidInvoices / stats.totalInvoices) * 100}%` : '0%' }} />
          </div>
          <p className="font-mono text-[9px] text-[#1b4332] mt-2 tracking-widest">
            {stats.paidInvoices}/{stats.totalInvoices} PAID
          </p>
        </div>
      </div>
    </div>
  )
}
