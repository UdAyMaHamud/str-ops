import React from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router'
import LayoutOne from './layout/LayoutOne'
import AdminLayout from './layout/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import PersistAuth from './components/common/PersistAuth'
import { ALL_ROLES, STAFF_ROLES } from './store/slices/authSlice'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Overview from './pages/Overview'
import AddProperty from './pages/AddProperty'
import Inbox from './pages/Inbox'
import Turnovers from './pages/Turnovers'
import SmartHome from './pages/SmartHome'
import Maintenance from './pages/Maintenance'
import Pricing from './pages/Pricing'
import Listings from './pages/Listings'
import OwnerReport from './pages/OwnerReport'
import Screening from './pages/Screening'
import Reviews from './pages/Reviews'
import Integrations from './pages/Integrations'
import Escalations from './pages/Escalations'
import Training from './pages/Training'
import Users from './pages/Users'
import Stays from './pages/Stays'
import StayDetails from './pages/StayDetails'
import Trips from './pages/Trips'
import Saved from './pages/Saved'

const App = () => {
  const myRoute = createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* ====== Public site ====== */}
        <Route path="/" element={<LayoutOne />}>
          <Route index element={<Landing />} />
          <Route path="stays" element={<Stays />} />
          <Route path="stays/:id" element={<StayDetails />} />

          {/* ====== Guests ====== */}
          <Route element={<ProtectedRoute allowedRoles={['guest']} />}>
            <Route path="trips" element={<Trips />} />
            <Route path="saved" element={<Saved />} />
          </Route>
        </Route>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ====== Dashboard (owners + staff) ====== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={ALL_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="listings" element={<Listings />} />
          <Route path="properties/new" element={<ProtectedRoute allowedRoles={['client', 'admin']}><AddProperty /></ProtectedRoute>} />
          <Route path="turnovers" element={<Turnovers />} />
          <Route path="smart-home" element={<SmartHome />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="owner-report" element={<OwnerReport />} />
          <Route path="reviews" element={<Reviews />} />

          {/* ====== Staff only ====== */}
          <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
            <Route path="inbox" element={<Inbox />} />
            <Route path="screening" element={<Screening />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="escalations" element={<Escalations />} />
            <Route path="training" element={<Training />} />
          </Route>

          {/* ====== Admin only ====== */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="users" element={<Users />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </>
    )
  )

  return (
    <PersistAuth>
      <RouterProvider router={myRoute} />
    </PersistAuth>
  )
}

export default App
