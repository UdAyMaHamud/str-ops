import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiHeart } from 'react-icons/fi'
import { selectCurrentUser } from '../../store/slices/authSlice'
import { useGetWishlistQuery, useToggleWishlistMutation } from '../../store/api/bookingApi'

// ====== Heart on a stay. Visitors are sent to sign in; owners and staff do not see it.
const SaveButton = ({ propertyId, className = '' }) => {
  const user = useSelector(selectCurrentUser)
  const navigate = useNavigate()
  const location = useLocation()
  const isGuest = user?.role === 'guest'
  const { data } = useGetWishlistQuery(undefined, { skip: !isGuest })
  const [toggleWishlist, { isLoading }] = useToggleWishlistMutation()
  const saved = (data?.data || []).some((w) => w.property?._id === propertyId)

  if (user && !isGuest) return null

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/signin', { state: { from: location } })
    try {
      const res = await toggleWishlist(propertyId).unwrap()
      toast.success(res.message, { duration: 1800, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved stays' : 'Save this stay'}
      className={`h-9 w-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer active:scale-90 ${className}`}
    >
      <FiHeart size={16} className={saved ? 'fill-critical text-critical' : 'text-navy'} />
    </button>
  )
}

export default SaveButton
