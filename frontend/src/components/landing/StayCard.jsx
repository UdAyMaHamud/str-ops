import React from 'react'
import { Link } from 'react-router'
import { FiStar, FiMapPin, FiHome, FiUsers } from 'react-icons/fi'
import { imgUrl, money } from '../common/format'
import SaveButton from '../stay/SaveButton'

const StayCard = ({ stay, query = '' }) => {
  return (
    <Link
      to={`/stays/${stay._id}${query}`}
      className="group block rounded-3xl bg-white border border-navy/5 overflow-hidden shadow-[0_20px_50px_-35px_rgba(30,42,74,0.5)] hover:-translate-y-1 transition-transform"
    >
      <div className="relative h-52 overflow-hidden">
        {stay.image ? (
          <img src={imgUrl(stay.image)} alt={stay.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="h-full w-full bg-sky-3 flex items-center justify-center text-navy/30"><FiHome size={36} /></div>
        )}
        {stay.rating && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[12px] font-semibold text-navy">
            <FiStar className="fill-warning text-warning" size={12} /> {stay.rating}
            <span className="font-normal text-navy/50">({stay.reviewCount})</span>
          </span>
        )}
        <SaveButton propertyId={stay._id} className="absolute top-3 right-3" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-navy truncate">{stay.name}</h3>
            <p className="flex items-center gap-1 text-[13px] text-navy/60"><FiMapPin size={12} /> {stay.city}, {stay.state}</p>
          </div>
          <p className="text-right shrink-0">
            <span className="text-[18px] font-bold text-navy">{money(stay.basePrice)}</span>
            <span className="block text-[11px] text-navy/50">per night from</span>
          </p>
        </div>
        {stay.description && <p className="mt-3 text-[13px] text-navy/70 line-clamp-2">{stay.description}</p>}
        <div className="mt-4 flex items-center justify-between text-[12px] text-navy/60">
          <span>{stay.bedrooms} bedroom{stay.bedrooms > 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1"><FiUsers size={12} /> up to {stay.maxGuests}</span>
          <span className="rounded-full bg-navy text-white px-3 py-1 text-[11px] font-semibold group-hover:bg-navy/90">View dates</span>
        </div>
      </div>
    </Link>
  )
}

export default StayCard
