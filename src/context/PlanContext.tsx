import { 
  createContext, useContext, useState, 
  useEffect, useRef, ReactNode 
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export type PlanName = 'covert' | 'phantom' | 'apex'

export interface PlanFeatures {
  tasks: boolean
  kanban: boolean
  calendar: boolean
  todos: boolean
  reminders: boolean
  docs: { enabled: boolean; limit: number }
  vault: { enabled: boolean; limit: number }
  invoices: boolean
  finance: boolean
  collab: boolean
  analytics: boolean
}

export interface UserPlan {
  plan: PlanName
  status: string
  features: PlanFeatures
}

const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  covert: {
    tasks: true,
    kanban: true,
    calendar: true,
    todos: true,
    reminders: true,
    docs: { enabled: true, limit: 5 },
    vault: { enabled: true, limit: 10 },
    invoices: false,
    finance: false,
    collab: false,
    analytics: false,
  },
  phantom: {
    tasks: true,
    kanban: true,
    calendar: true,
    todos: true,
    reminders: true,
    docs: { enabled: true, limit: 50 },
    vault: { enabled: true, limit: 100 },
    invoices: true,
    finance: true,
    collab: true,
    analytics: true,
  },
  apex: {
    tasks: true,
    kanban: true,
    calendar: true,
    todos: true,
    reminders: true,
    docs: { enabled: true, limit: -1 },
    vault: { enabled: true, limit: -1 },
    invoices: true,
    finance: true,
    collab: true,
    analytics: true,
  },
}

interface PlanContextType {
  userPlan: UserPlan | null
  loading: boolean
  canUse: (feature: keyof PlanFeatures) => boolean
  getLimit: (feature: 'docs' | 'vault') => number
  upgradePlan: (plan: PlanName) => Promise<boolean>
  refetch: () => void
}

const PlanContext = createContext<PlanContextType | null>(null)

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  const fetchPlan = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .single()

      const planName = (data?.plan || 'covert') as PlanName

      if (isMounted.current) {
        setUserPlan({
          plan: planName,
          status: data?.status || 'active',
          features: PLAN_FEATURES[planName],
        })
      }
    } catch {
      if (isMounted.current) {
        setUserPlan({
          plan: 'covert',
          status: 'active',
          features: PLAN_FEATURES.covert,
        })
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  const upgradePlan = async (newPlan: PlanName): Promise<boolean> => {
    if (!user?.id) return false
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan: newPlan,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) throw error

      // Instantly update context state — no refetch needed
      if (isMounted.current) {
        setUserPlan({
          plan: newPlan,
          status: 'active',
          features: PLAN_FEATURES[newPlan],
        })
      }
      return true
    } catch (err: any) {
      console.error('Upgrade error:', err.message)
      return false
    }
  }

  const canUse = (feature: keyof PlanFeatures): boolean => {
    if (!userPlan) return false
    const f = userPlan.features[feature]
    if (typeof f === 'boolean') return f
    if (typeof f === 'object') return f.enabled
    return false
  }

  const getLimit = (feature: 'docs' | 'vault'): number => {
    if (!userPlan) return 0
    const f = userPlan.features[feature]
    return typeof f === 'object' ? f.limit : 0
  }

  useEffect(() => {
    isMounted.current = true
    if (user?.id) {
      fetchPlan()

      // Realtime: if plan changes from another 
      // device or admin panel — update instantly
      const channel = supabase
        .channel('plan-ctx-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          // Instantly apply new plan from DB event
          const newPlan = (
            payload.new?.plan || 'covert'
          ) as PlanName
          if (isMounted.current) {
            setUserPlan({
              plan: newPlan,
              status: payload.new?.status || 'active',
              features: PLAN_FEATURES[newPlan],
            })
          }
        })
        .subscribe()

      return () => {
        isMounted.current = false
        channel.unsubscribe()
      }
    }
    return () => { isMounted.current = false }
  }, [user?.id])

  return (
    <PlanContext.Provider value={{
      userPlan,
      loading,
      canUse,
      getLimit,
      upgradePlan,
      refetch: fetchPlan,
    }}>
      {children}
    </PlanContext.Provider>
  )
}

// Hook to use anywhere
export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error(
    'usePlan must be used inside PlanProvider'
  )
  return ctx
}
