import React from 'react'
import toast from 'react-hot-toast'
import { FiLink } from 'react-icons/fi'
import { useGetUsersQuery } from '../../store/api/userApi'
import { useAssignOwnerMutation } from '../../store/api/overviewApi'

// ====== Admin: which owner a listing belongs to (Hostaway listings arrive without one)
const OwnerPicker = ({ property }) => {
  const { data } = useGetUsersQuery({ role: 'client' })
  const [assignOwner, { isLoading }] = useAssignOwnerMutation()
  const owners = data?.data || []
  const current = property.owner?._id || property.owner || ''

  const handleChange = async (e) => {
    try {
      const res = await assignOwner({ id: property._id, owner: e.target.value || null }).unwrap()
      toast.success(res.message, { duration: 2000, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-mint px-3 py-2 text-[12px]">
      {property.hostawayId && <span className="inline-flex items-center gap-1 font-semibold text-accent"><FiLink size={12} /> Hostaway #{property.hostawayId}</span>}
      <label className="ml-auto flex items-center gap-2 text-ink-2">
        Owner
        <select
          value={current}
          onChange={handleChange}
          disabled={isLoading}
          className="h-8 rounded-lg border border-line bg-white px-2 text-[12px] cursor-pointer"
          aria-label={`Owner of ${property.name}`}
        >
          <option value="">No owner yet</option>
          {owners.map((o) => <option key={o._id} value={o._id}>{o.fullName}</option>)}
        </select>
      </label>
    </div>
  )
}

export default OwnerPicker
