import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface DashboardStats {
  totalTasks: number
  pendingTasks: number
  doneTasks: number
  totalTodos: number
  completedTodos: number
  totalInvoices: number
  paidInvoices: number
  totalTransactions: number
  totalIncome: number
  totalExpense: number
  totalReminders: number
  upcomingReminders: number
  kanbanCards: number
  totalDocs: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'task' | 'todo' | 'invoice' | 'reminder' | 'kanban' | 'transaction' | 'doc' | 'vault'
  action: 'created' | 'completed' | 'updated' | 'in progress' | 'scheduled'
  title: string
  time: string
  timestamp: string
}

const defaultStats: DashboardStats = {
  totalTasks: 0,
  pendingTasks: 0,
  doneTasks: 0,
  totalTodos: 0,
  completedTodos: 0,
  totalInvoices: 0,
  paidInvoices: 0,
  totalTransactions: 0,
  totalIncome: 0,
  totalExpense: 0,
  totalReminders: 0,
  upcomingReminders: 0,
  kanbanCards: 0,
  totalDocs: 0,
  recentActivity: [],
}

export function useRealtimeData() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)
  const channels = useRef<any[]>([])

  const fetchAllStats = async () => {
    if (!user?.id) return
    
    try {
      // Fetch all in parallel
      const [
        tasksRes,
        todosRes,
        invoicesRes,
        transactionsRes,
        remindersRes,
        kanbanRes,
        docsRes,
      ] = await Promise.allSettled([
        supabase.from('tasks')
          .select('id, title, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('todos')
          .select('id, title, completed, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('invoices')
          .select('id, invoice_number, client_name, status, total, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('transactions')
          .select('id, type, amount, description, category, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('reminders')
          .select('id, title, remind_at, completed, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('kanban_cards')
          .select('id, title, created_at, user_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase.from('docs')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ])

      const tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : []
      const todos = todosRes.status === 'fulfilled' ? (todosRes.value.data || []) : []
      const invoices = invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data || []) : []
      const transactions = transactionsRes.status === 'fulfilled' ? (transactionsRes.value.data || []) : []
      const reminders = remindersRes.status === 'fulfilled' ? (remindersRes.value.data || []) : []
      const kanbanCards = kanbanRes.status === 'fulfilled' ? (kanbanRes.value.data || []) : []
      const docs = docsRes.status === 'fulfilled' ? (docsRes.value.data || []) : []

      // Build recent activity from all sources
      const activity: ActivityItem[] = []
      
      // Track ALL recent tasks (including status changes)
      tasks.slice(0, 5).forEach((t: any) => {
        activity.push({
          id: t.id,
          type: 'task',
          action: t.status === 'done' 
            ? 'completed' 
            : t.status === 'in_progress'
              ? 'in progress'
              : 'created',
          title: t.title || 'Untitled task',
          time: formatTime(
            t.updated_at || t.created_at
          ),
          timestamp: t.updated_at || t.created_at,
        })
      })
      
      reminders.slice(0, 3).forEach((r: any) => {
        activity.push({
          id: r.id,
          type: 'reminder',
          action: 'scheduled',
          title: r.title || 'Untitled reminder',
          time: formatTime(r.created_at),
          timestamp: r.created_at,
        })
      })
      
      todos.slice(0, 3).forEach((t: any) => {
        activity.push({
          id: t.id,
          type: 'todo',
          action: t.completed ? 'completed' : 'created',
          title: t.title || 'Untitled todo',
          time: formatTime(t.created_at),
          timestamp: t.created_at,
        })
      })
      
      invoices.slice(0, 3).forEach((inv: any) => {
        activity.push({
          id: inv.id,
          type: 'invoice',
          action: 'created',
          title: `INV-${inv.invoice_number || ''} ${inv.client_name || ''}`,
          time: formatTime(inv.created_at),
          timestamp: inv.created_at,
        })
      })

      docs.slice(0, 2).forEach((d: any) => {
        activity.push({
          id: d.id,
          type: 'doc',
          action: 'updated',
          title: d.title || 'Untitled doc',
          time: formatTime(d.updated_at),
          timestamp: d.updated_at,
        })
      })

      // Sort all activity by timestamp desc
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      const totalIncome = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)
      
      const totalExpense = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      if (isMounted.current) {
        setStats({
          totalTasks: tasks.length,
          pendingTasks: tasks.filter((t: any) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'pending').length,
          doneTasks: tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length,
          totalTodos: todos.length,
          completedTodos: todos.filter((t: any) => t.completed).length,
          totalInvoices: invoices.length,
          paidInvoices: invoices.filter((inv: any) => inv.status === 'paid').length,
          totalTransactions: transactions.length,
          totalIncome,
          totalExpense,
          totalReminders: reminders.length,
          upcomingReminders: reminders.filter((r: any) => !r.completed).length,
          kanbanCards: kanbanCards.length,
          totalDocs: docs.length,
          recentActivity: activity.slice(0, 10),
        })
        setLoading(false)
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
      if (isMounted.current) setLoading(false)
    }
  }

  // Supabase Realtime subscriptions
  const setupRealtimeSubscriptions = () => {
    if (!user?.id) return

    // Unsubscribe old channels first
    channels.current.forEach(ch => ch.unsubscribe())
    channels.current = []

    const tables = [
      'tasks', 'todos', 'invoices', 
      'transactions', 'reminders', 
      'kanban_cards', 'docs'
    ]

    tables.forEach(table => {
      const channel = supabase
        .channel(`realtime-${table}-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Any change in any table → refetch all stats
            if (isMounted.current) {
              fetchAllStats()
            }
          }
        )
        .subscribe()
      
      channels.current.push(channel)
    })
  }

  useEffect(() => {
    isMounted.current = true
    
    if (user?.id) {
      fetchAllStats()
      setupRealtimeSubscriptions()
    }

    return () => {
      isMounted.current = false
      // Cleanup all subscriptions on unmount
      channels.current.forEach(ch => ch.unsubscribe())
      channels.current = []
    }
  }, [user?.id])

  return { stats, loading, refetch: fetchAllStats, lastUpdated: Date.now() }
}

// Helper: format timestamp to readable time
function formatTime(timestamp: string): string {
  if (!timestamp) return 'JUST NOW'
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'JUST NOW'
    if (diffMins < 60) return `${diffMins}M AGO`
    if (diffHours < 24) return `${diffHours}H AGO`
    if (diffDays < 7) return `${diffDays}D AGO`
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short'
    }).toUpperCase()
  } catch {
    return 'RECENT'
  }
}
