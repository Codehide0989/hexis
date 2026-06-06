import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

interface UpgradeGateProps {
  feature: string
  requiredPlan: 'phantom' | 'apex'
  children: React.ReactNode
  enabled: boolean
}

export function UpgradeGate({ 
  feature, 
  requiredPlan, 
  children, 
  enabled 
}: UpgradeGateProps) {
  const navigate = useNavigate()

  if (enabled) return <>{children}</>

  const planColor = requiredPlan === 'apex' ? '#e9c46a' : '#52b788'

  return (
    <div className="relative h-full w-full min-h-[400px]">
      {/* Blurred background */}
      <div className="opacity-30 pointer-events-none 
        select-none blur-[2px] grayscale cursor-not-allowed h-full overflow-hidden">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center 
        justify-center z-50 cursor-not-allowed">
        <div className="text-center max-w-sm px-8 py-10 bg-[#0a1a0f]/95 
          border animate-pulse shadow-2xl"
          style={{ 
            borderColor: planColor,
            animationDuration: '3s',
            boxShadow: `0 0 40px ${planColor}15`
          }}>
          <div className="w-16 h-16 border flex items-center justify-center mx-auto mb-6"
            style={{ borderColor: planColor }}>
            <Lock size={28} style={{ color: planColor }} />
          </div>
          <p className="font-mono font-bold text-base 
            text-[#d8f3dc] uppercase tracking-widest mb-3">
            {feature.toUpperCase()} LOCKED
          </p>
          <div className="inline-block mb-6">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1"
              style={{ background: planColor, color: '#0a1a0f' }}>
              REQUIRES {requiredPlan} PLAN
            </span>
          </div>
          <button
            onClick={() => navigate(`/dashboard/plan?plan=${requiredPlan}`)}
            className="w-full py-3 font-mono text-xs uppercase tracking-widest font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
            style={{ background: planColor, borderColor: planColor, color: '#0a1a0f' }}>
            UPGRADE TO {requiredPlan.toUpperCase()} →
          </button>
        </div>
      </div>
    </div>
  )
}
