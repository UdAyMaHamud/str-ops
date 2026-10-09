import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { setCredentials, landingPathFor } from '../../store/slices/authSlice'

// ====== Shared by sign in and Google: the server already set the httpOnly cookies,
// so we only store the user in Redux and open the dashboard
const useCompleteLogin = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // redirectTo wins when it suits the role; otherwise each role goes to its own home
  return (res, redirectTo) => {
    if (!res?.success) return
    dispatch(setCredentials({ user: res.data, token: null }))
    toast.success(res.message || `Welcome, ${res.data.fullName}`, { duration: 2500, position: 'top-center' })
    navigate(landingPathFor(res.data.role, redirectTo), { replace: true })
  }
}

export default useCompleteLogin
