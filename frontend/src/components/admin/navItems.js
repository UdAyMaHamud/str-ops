import {
  FiGrid, FiMessageSquare, FiRefreshCw, FiWifi, FiTool, FiDollarSign, FiHome, FiFileText,
  FiShield, FiStar, FiServer, FiAlertTriangle, FiBookOpen, FiUsers,
} from 'react-icons/fi'

// Every page once; `names` gives a role its own label
const ITEMS = {
  overview: { Name: 'Overview', names: { trainee: 'My shift', senior: 'Review queue', client: 'Home' }, path: '/dashboard', icon: FiGrid },
  listings: { Name: 'Properties', names: { client: 'My properties' }, path: '/dashboard/listings', icon: FiHome },
  inbox: { Name: 'Inbox & Drafts', path: '/dashboard/inbox', icon: FiMessageSquare },
  turnovers: { Name: 'Turnovers', names: { client: 'Cleaning' }, path: '/dashboard/turnovers', icon: FiRefreshCw },
  smartHome: { Name: 'Smart Home', path: '/dashboard/smart-home', icon: FiWifi },
  maintenance: { Name: 'Maintenance', names: { client: 'Repairs' }, path: '/dashboard/maintenance', icon: FiTool },
  pricing: { Name: 'Pricing', path: '/dashboard/pricing', icon: FiDollarSign },
  ownerReport: { Name: 'Owner Report', names: { client: 'Monthly statement' }, path: '/dashboard/owner-report', icon: FiFileText },
  screening: { Name: 'Screening', path: '/dashboard/screening', icon: FiShield },
  reviews: { Name: 'Reviews & Claims', names: { client: 'Reviews' }, path: '/dashboard/reviews', icon: FiStar },
  integrations: { Name: 'Integrations', path: '/dashboard/integrations', icon: FiServer },
  escalations: { Name: 'Escalations', path: '/dashboard/escalations', icon: FiAlertTriangle },
  training: { Name: 'Training', names: { trainee: 'My training' }, path: '/dashboard/training', icon: FiBookOpen },
  users: { Name: 'Users', path: '/dashboard/users', icon: FiUsers },
}

// ====== Each role sees its own menu, in the order that matters to that role
const NAV_BY_ROLE = {
  client: ['overview', 'listings', 'ownerReport', 'pricing', 'reviews', 'maintenance', 'turnovers', 'smartHome'],
  trainee: ['overview', 'inbox', 'training', 'turnovers', 'smartHome', 'maintenance', 'screening', 'reviews', 'escalations', 'pricing', 'listings', 'ownerReport', 'integrations'],
  senior: ['overview', 'inbox', 'turnovers', 'screening', 'escalations', 'training', 'smartHome', 'maintenance', 'reviews', 'pricing', 'listings', 'ownerReport', 'integrations'],
  admin: ['overview', 'users', 'listings', 'integrations', 'training', 'inbox', 'turnovers', 'screening', 'escalations', 'smartHome', 'maintenance', 'reviews', 'pricing', 'ownerReport'],
}

export const navFor = (role) =>
  (NAV_BY_ROLE[role] || []).map((key) => {
    const item = ITEMS[key]
    return { ...item, Name: item.names?.[role] || item.Name }
  })
