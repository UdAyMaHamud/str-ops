import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import Sidebar from '../components/admin/Sidebar'
import Topbar from '../components/admin/Topbar'
import EnvBanner from '../components/admin/EnvBanner'
import { useLogoutMutation } from '../store/api/authApi'
import { logout } from '../store/slices/authSlice'
import { setProperty } from '../store/slices/filterSlice'
import { apiSlice } from '../store/apiSlice'

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutRequest] = useLogoutMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // ====== Sign out (shared by sidebar + profile menu)
  const handleSignOut = async () => {
    try {
      // The server clears the httpOnly cookies
      await logoutRequest().unwrap()
    } catch (err) {
      console.log(err)
    }
    dispatch(logout())
    dispatch(setProperty('all'))
    dispatch(apiSlice.util.resetApiState())
    navigate('/signin')
  }

  return (
    <div className="min-h-screen flex bg-page">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onSignOut={handleSignOut} />
      <div className="flex-1 min-w-0 flex flex-col">
        <EnvBanner />
        <Topbar onMenu={() => setMenuOpen(true)} onSignOut={handleSignOut} />
        <main className="flex-1 px-4 lg:px-8 pb-8 pt-2 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
