import { useState } from 'react'
import { usePlan } from '../../context/PlanContext'
import { useAuth } from '../../hooks/useAuth'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { sendUpgradeEmail } from '../../lib/upgradeEmail'
import { 
  Check, Lock, Zap, Shield, Crown,
  AlertTriangle 
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const PLANS = [
  {
    id: 'covert' as const,
    name: 'COVERT',
    price: 0,
    tagline: 'For single operatives.',
    icon: <Shield size={20} />,
    color: '#95d5b2',
    borderColor: '#1b4332',
    features: [
      { text: 'Tasks & Kanban', included: true },
      { text: 'Calendar & Reminders', included: true },
      { text: 'Todos', included: true },
      { text: '5 Documents', included: true },
      { text: '10 Vault Entries', included: true },
      { text: 'Invoices & Finance', included: false },
      { text: 'Collab Workspace', included: false },
      { text: 'Analytics', included: false },
      { text: 'Priority Support', included: false },
    ],
  },
  {
    id: 'phantom' as const,
    name: 'PHANTOM',
    price: 5,
    tagline: 'For serious professionals.',
    icon: <Zap size={20} />,
    color: '#52b788',
    borderColor: '#52b788',
    recommended: true,
    features: [
      { text: 'Everything in COVERT', included: true },
      { text: '50 Documents', included: true },
      { text: '100 Vault Entries', included: true },
      { text: 'Invoices & Finance', included: true },
      { text: 'Collab Workspace', included: true },
      { text: 'Analytics Dashboard', included: true },
      { text: 'Priority Syncing', included: true },
      { text: 'Priority Support', included: false },
      { text: 'Dedicated Node', included: false },
    ],
  },
  {
    id: 'apex' as const,
    name: 'APEX',
    price: 15,
    tagline: 'Maximum security tier.',
    icon: <Crown size={20} />,
    color: '#e9c46a',
    borderColor: '#e9c46a',
    features: [
      { text: 'Everything in PHANTOM', included: true },
      { text: 'Unlimited Documents', included: true },
      { text: 'Unlimited Vault Entries', included: true },
      { text: 'Dedicated Node', included: true },
      { text: 'Direct Ops Support', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'SLA Guarantee', included: true },
      { text: 'Early Access Features', included: true },
      { text: 'White-label Option', included: true },
    ],
  },
]

export default function Plan() {
  const { userPlan, loading, upgradePlan } = usePlan()
  const { user } = useAuth()
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    if (planId === userPlan?.plan) return
    if (planId === 'covert' && userPlan?.plan !== 'covert') {
      toast.error('DOWNGRADE NOT AVAILABLE')
      return
    }
    setShowConfirm(planId)
  }

  const confirmUpgrade = async () => {
    if (!showConfirm) return
    
    if (showConfirm === 'covert') {
      toast.error('DOWNGRADE NOT AVAILABLE')
      setShowConfirm(null)
      return
    }

    setUpgrading(showConfirm)
    const planId = showConfirm as 'phantom' | 'apex'

    openRazorpayCheckout({
      planId,
      userEmail: user?.email || '',
      userName: user?.email?.split('@')[0] || 'Agent',
      onSuccess: async (response) => {
        const success = await upgradePlan(planId)
        if (success) {
          const planFeatures = PLANS.find(p => p.id === planId)?.features.filter(f => f.included).map(f => f.text) || []
          await sendUpgradeEmail({
            to: user?.email || '',
            userName: user?.email?.split('@')[0] || 'Agent',
            plan: planId,
            paymentId: response.razorpay_payment_id,
            features: planFeatures
          })
          toast.success(
            `✓ ${planId.toUpperCase()} ACTIVATED — \n  All features unlocked`,
            { duration: 4000 }
          )
        } else {
          toast.error('UPGRADE FAILED. CONTACT SUPPORT.')
        }
        setUpgrading(null)
        setShowConfirm(null)
      },
      onFailure: (reason) => {
        toast.error(`PAYMENT FAILED: ${reason}`)
        setUpgrading(null)
        setShowConfirm(null)
      }
    })
  }

  if (loading) return (
    <div className="p-6 md:p-8 bg-[#0a1a0f] min-h-full">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#0d2818] 
          border border-[#1b4332]" />
        <div className="grid grid-cols-1 md:grid-cols-3 
          gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-96 bg-[#0d2818] 
              border border-[#1b4332]" />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 bg-[#0a1a0f] 
      min-h-full overflow-y-auto">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs 
            text-[#52b788]">&gt;</span>
          <h1 className="font-mono font-bold text-2xl 
            text-[#d8f3dc] uppercase tracking-wider">
            RESOURCE_ALLOCATION
          </h1>
        </div>
        <p className="font-mono text-xs text-[#52b788]">
          MANAGE YOUR SUBSCRIPTION TIER
        </p>
      </div>

      {/* Current Plan Badge */}
      <div className="bg-[#0d2818] border border-[#1b4332] 
        p-4 mb-8 flex flex-col sm:flex-row 
        sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#52b788] 
            rounded-full animate-pulse" />
          <span className="font-mono text-xs 
            text-[#95d5b2] uppercase tracking-widest">
            CURRENT PLAN:
          </span>
          <span className="font-mono font-bold text-sm 
            text-[#52b788] uppercase tracking-widest 
            border border-[#52b788] px-3 py-1">
            {userPlan?.plan.toUpperCase() || 'COVERT'}
          </span>
        </div>
        <span className="font-mono text-xs 
          text-[#95d5b2]">
          STATUS: {userPlan?.status.toUpperCase() || 'ACTIVE'}
        </span>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 
        gap-6 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = userPlan?.plan === plan.id
          const isUpgrade = 
            PLANS.findIndex(p => p.id === plan.id) > 
            PLANS.findIndex(p => p.id === userPlan?.plan)
          const isLoading = upgrading === plan.id

          return (
            <div
              key={plan.id}
              className={`
                relative bg-[#0d2818] flex flex-col
                transition-all duration-200
                ${isCurrent 
                  ? 'border-2' 
                  : 'border hover:border-opacity-80'
                }
              `}
              style={{ 
                borderColor: isCurrent 
                  ? plan.color 
                  : plan.recommended 
                    ? plan.borderColor 
                    : '#1b4332' 
              }}
            >
              {/* Recommended badge */}
              {plan.recommended && !isCurrent && (
                <div className="absolute -top-3 
                  left-1/2 -translate-x-1/2">
                  <span className="font-mono text-[10px] 
                    font-bold uppercase tracking-widest 
                    bg-[#52b788] text-[#0a1a0f] 
                    px-3 py-1">
                    RECOMMENDED
                  </span>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3 
                  left-1/2 -translate-x-1/2">
                  <span 
                    className="font-mono text-[10px] 
                      font-bold uppercase tracking-widest 
                      px-3 py-1"
                    style={{ 
                      background: plan.color,
                      color: '#0a1a0f'
                    }}>
                    ACTIVE PLAN
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Plan header */}
                <div className="flex items-center gap-2 mb-1"
                  style={{ color: plan.color }}>
                  {plan.icon}
                  <h2 className="font-mono font-bold 
                    text-lg tracking-widest">
                    {plan.name}
                  </h2>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1 
                  my-4">
                  <span className="font-mono text-sm 
                    text-[#95d5b2] mb-1">$</span>
                  <span 
                    className="font-mono font-bold 
                      text-5xl leading-none"
                    style={{ color: plan.color }}>
                    {plan.price}
                  </span>
                  <span className="font-mono text-xs 
                    text-[#95d5b2] mb-1">/MO</span>
                </div>

                <p className="font-sans text-xs 
                  text-[#95d5b2] mb-6">
                  {plan.tagline}
                </p>

                {/* Divider */}
                <div className="border-t border-[#1b4332] 
                  mb-4" />

                {/* Features list */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} 
                      className="flex items-center gap-2.5">
                      {f.included ? (
                        <Check 
                          size={13} 
                          style={{ color: plan.color }}
                          className="flex-shrink-0" 
                        />
                      ) : (
                        <Lock 
                          size={13} 
                          className="text-[#1b4332] 
                            flex-shrink-0" 
                        />
                      )}
                      <span className={`font-sans text-xs 
                        ${f.included 
                          ? 'text-[#d8f3dc]' 
                          : 'text-[#2d6a4f]'
                        }`}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || isLoading || 
                    (!isUpgrade && !isCurrent)}
                  className={`
                    w-full py-2.5 font-mono text-xs 
                    uppercase tracking-widest 
                    font-bold border transition-colors
                    flex items-center justify-center gap-2
                    ${isCurrent
                      ? 'cursor-default opacity-60'
                      : isUpgrade
                        ? 'cursor-pointer hover:opacity-90'
                        : 'cursor-not-allowed opacity-30'
                    }
                  `}
                  style={isCurrent ? {
                    borderColor: plan.color,
                    color: plan.color,
                  } : isUpgrade ? {
                    background: plan.color,
                    borderColor: plan.color,
                    color: '#0a1a0f',
                  } : {
                    borderColor: '#1b4332',
                    color: '#1b4332',
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3 h-3 border 
                        border-current border-t-transparent 
                        rounded-full animate-spin" />
                      PROCESSING...
                    </>
                  ) : isCurrent ? (
                    '✓ CURRENT PLAN'
                  ) : isUpgrade ? (
                    `UPGRADE TO ${plan.name} →`
                  ) : (
                    'DOWNGRADE N/A'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pay as you go note */}
      <div className="bg-[#0d2818] border border-[#1b4332] 
        p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={14} 
            className="text-[#e9c46a] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-xs font-bold 
              text-[#e9c46a] uppercase tracking-wider mb-1">
              PAY AS YOU GO
            </p>
            <p className="font-sans text-xs text-[#95d5b2] 
              leading-relaxed">
              All paid plans are billed monthly. 
              Cancel anytime. Upgrade takes effect 
              immediately. Downgrade takes effect 
              at end of billing cycle. 
              No refunds for partial months.
            </p>
          </div>
        </div>
      </div>

      {/* Feature comparison note */}
      <div className="bg-[#0d2818] border border-[#1b4332] 
        p-4">
        <p className="font-mono text-xs text-[#52b788] 
          uppercase tracking-widest mb-3">
          COVERT PLAN LIMITATIONS
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 
          gap-2">
          {[
            'Invoices module — PHANTOM+',
            'Finance tracker — PHANTOM+',
            'Collab workspaces — PHANTOM+',
            'Analytics dashboard — PHANTOM+',
            'More than 5 docs — PHANTOM+',
            'More than 10 vault entries — PHANTOM+',
          ].map((item, i) => (
            <div key={i} 
              className="flex items-center gap-2">
              <Lock size={11} 
                className="text-[#e63946] flex-shrink-0" />
              <span className="font-sans text-xs 
                text-[#95d5b2]">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm upgrade modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 
          flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2818] border-2 
            border-[#52b788] p-6 max-w-sm w-full">
            <h3 className="font-mono font-bold text-lg 
              text-[#d8f3dc] uppercase tracking-wider mb-2">
              CONFIRM UPGRADE
            </h3>
            <p className="font-sans text-sm 
              text-[#95d5b2] mb-6">
              Upgrade to{' '}
              <span className="font-bold text-[#52b788] 
                uppercase">
                {showConfirm}
              </span>
              {' '}plan? This will activate immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 hex-btn-outline 
                  text-xs py-2.5">
                CANCEL
              </button>
              <button
                onClick={confirmUpgrade}
                className="flex-1 hex-btn-primary 
                  text-xs py-2.5">
                CONFIRM →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
