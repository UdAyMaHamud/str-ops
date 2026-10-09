import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGetProfileQuery } from '../../store/api/authApi'
import { selectIsAuthenticated, setCredentials } from '../../store/slices/authSlice'

// Restores the signed-in user after a refresh. The auth cookie is httpOnly, so the browser
// cannot tell whether a session exists: ask the server once and treat 401 as "logged out".
const PersistAuth = ({ children }) => {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  // Only the first answer restores a session, so a later sign-out is never undone by cached data
  const restoredRef = useRef(false)
  const { data, isLoading, isSuccess, isError } = useGetProfileQuery(undefined, { skip: restoredRef.current || isAuthenticated })

  useEffect(() => {
    if (restoredRef.current) return
    if (isSuccess && data?.success) {
      dispatch(setCredentials({ user: data.data, token: null }))
      restoredRef.current = true
    } else if (isError) {
      restoredRef.current = true
    }
  }, [isSuccess, isError, data, dispatch])

  // Wait until Redux has the answer, or ProtectedRoute bounces a signed-in user to /signin
  if (!restoredRef.current && !isAuthenticated && (isLoading || (isSuccess && data?.success))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <span className="h-10 w-10 rounded-full border-[3px] border-primary/15 border-t-primary animate-spin" />
      </div>
    )
  }

  return children
}

export default PersistAuth
