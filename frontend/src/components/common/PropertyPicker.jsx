import React from 'react'
import { useGetPropertiesQuery } from '../../store/api/overviewApi'

// Single-property picker for pages that need exactly one property
const PropertyPicker = ({ value, onChange }) => {
  const { data } = useGetPropertiesQuery()
  const properties = data?.data || []

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:border-accent cursor-pointer"
      aria-label="Property"
    >
      {properties.map((p) => (
        <option key={p._id} value={p._id}>
          {p.code} · {p.name}
        </option>
      ))}
    </select>
  )
}

export default PropertyPicker
