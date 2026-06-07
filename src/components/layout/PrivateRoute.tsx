import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function PrivateRoute({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, loading } = useAuth()

  // Show nothing while session is being restored
  // This prevents false redirect to /login on refresh
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] 
        flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border border-[#52b788] 
            border-t-transparent rounded-full 
            animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-[#52b788] 
            tracking-widest animate-pulse">
            RESTORING SESSION...
          </p>
        </div>
      </div>
    )
  }

  // If loading is done and no user → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
