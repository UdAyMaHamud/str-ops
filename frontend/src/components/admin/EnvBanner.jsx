import React from 'react'
import { useGetSystemInfoQuery } from '../../store/api/authApi'

// Staging first: always show which system you are looking at (Security Rule 3)
const EnvBanner = () => {
  const { data } = useGetSystemInfoQuery()
  const env = data?.data?.env || 'staging'
  const isProduction = env === 'production'

  return (
    <div
      className={`no-print text-center text-[11px] font-semibold tracking-wide py-1.5 ${
        isProduction ? 'bg-critical text-white' : 'bg-warning/90 text-ink'
      }`}
    >
      {isProduction
        ? 'PRODUCTION · live client data · changes need a senior review'
        : 'STAGING · mock data · nothing is sent to real guests'}
    </div>
  )
}

export default EnvBanner
