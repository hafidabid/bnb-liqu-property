import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '@/lib/apicall/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isTokenValid())

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(authService.isTokenValid())
    
    // Check purely on mount and standard events
    checkAuth()
    window.addEventListener('auth_changed', checkAuth)
    return () => window.removeEventListener('auth_changed', checkAuth)
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
