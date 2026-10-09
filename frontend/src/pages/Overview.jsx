import React from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../store/slices/authSlice'
import OwnerHome from '../components/home/OwnerHome'
import TraineeHome from '../components/home/TraineeHome'
import SeniorHome from '../components/home/SeniorHome'
import AdminHome from '../components/home/AdminHome'

// ====== Each role gets its own home: owner money, trainee day card, senior review queue, admin platform
const HOMES = {
  client: OwnerHome,
  trainee: TraineeHome,
  senior: SeniorHome,
  admin: AdminHome,
}

const Overview = () => {
  const user = useSelector(selectCurrentUser)
  const Home = HOMES[user?.role] || OwnerHome
  return <Home />
}

export default Overview
