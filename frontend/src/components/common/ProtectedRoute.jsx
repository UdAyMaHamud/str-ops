import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router'
import { useSelector } from 'react-redux'
import { selectCurrentUser, selectIsAuthenticated, homePathFor } from '../../store/slices/authSlice'

const ProtectedRoute = ({ allowedRoles, children }) => {
  const location = useLocation()
  const user = useSelector(selectCurrentUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  // Wrong role: send people to their own home (guests to My trips, everyone else to the dashboard)
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const home = homePathFor(user?.role)
    return <Navigate to={location.pathname === home ? '/' : home} replace />
  }

  return children ? children : <Outlet />
}

export default ProtectedRoute
