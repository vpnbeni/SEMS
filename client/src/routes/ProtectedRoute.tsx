import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUser } from '../redux/slices/authSlice'

const CORE_ALLOWED_PREFIXES = [
  '/',
  '/dashboard',
  '/candidates',
  '/subjects',
  '/datesheets',
  '/billing',
]

const isCoreAllowedPath = (pathname: string): boolean => {
  return CORE_ALLOWED_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/'
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const accessMode = user?.billing?.accessMode
  if (accessMode === 'core_only' && !isCoreAllowedPath(location.pathname)) {
    return <Navigate to="/billing?reason=core-only" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
