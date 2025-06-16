import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../redux/slices/authSlice'

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute