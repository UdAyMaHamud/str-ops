import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiSearch } from 'react-icons/fi'
import { useGetUsersQuery, useUpdateRoleMutation } from '../store/api/userApi'
import { selectCurrentUser } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { timeAgo, initials } from '../components/common/format'

const ROLES = [
  ['guest', 'Guest'],
  ['client', 'Owner'],
  ['trainee', 'Trainee'],
  ['senior', 'Senior'],
  ['admin', 'Admin'],
]

const Users = () => {
  const me = useSelector(selectCurrentUser)
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useGetUsersQuery({ role: role || undefined, search: search || undefined })
  const [updateRole] = useUpdateRoleMutation()
  const users = data?.data || []

  const handleRole = async (u, nextRole) => {
    if (nextRole === u.role) return
    if (!window.confirm(`Change ${u.fullName} from ${u.role} to ${nextRole}?`)) return
    try {
      const res = await updateRole({ id: u._id, role: nextRole }).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who can sign in. People sign up as guests or owners; promote someone to trainee or senior here. New trainees start Day 1 today." />

      <Panel
        title={`${users.length} account(s)`}
        source="Admin only"
        rule="You cannot change your own role. An owner with properties stays an owner until the properties move."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center h-9 rounded-full border border-line bg-white px-3">
              <FiSearch size={13} className="text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className="ml-2 w-36 bg-transparent text-[12px] outline-none" aria-label="Search users" />
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-full border border-line bg-white px-3 text-[12px] cursor-pointer" aria-label="Filter by role">
              <option value="">All roles</option>
              {ROLES.map(([value, name]) => <option key={value} value={value}>{name}s</option>)}
            </select>
          </div>
        }
      >
        <StateBlock isLoading={isLoading} error={error} isEmpty={!users.length} emptyText="No users match">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <th className="py-2 pr-3 font-semibold">Person</th>
                  <th className="py-2 pr-3 font-semibold">Sign-in</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Properties</th>
                  <th className="py-2 pr-3 font-semibold">Joined</th>
                  <th className="py-2 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-full bg-primary-soft text-primary text-[12px] font-bold flex items-center justify-center shrink-0">{initials(u.fullName)}</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{u.fullName}{String(u._id) === String(me?._id) && <span className="ml-1 text-[11px] text-muted">(you)</span>}</p>
                          <p className="text-[11px] text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-2">{u.authProvider === 'google' ? 'Google' : 'Email'}</td>
                    <td className="py-2.5 pr-3">{u.isVerified ? <StatusBadge level="good">Verified</StatusBadge> : <StatusBadge level="pending">Unverified</StatusBadge>}</td>
                    <td className="py-2.5 pr-3 text-ink-2">{u.properties.join(', ') || '–'}</td>
                    <td className="py-2.5 pr-3 text-ink-2 whitespace-nowrap">{timeAgo(u.createdAt)}</td>
                    <td className="py-2.5">
                      <select
                        value={u.role}
                        disabled={String(u._id) === String(me?._id)}
                        onChange={(e) => handleRole(u, e.target.value)}
                        className="h-9 rounded-xl border border-line bg-white px-2.5 text-[12px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Role for ${u.fullName}`}
                      >
                        {ROLES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StateBlock>
      </Panel>
    </>
  )
}

export default Users
