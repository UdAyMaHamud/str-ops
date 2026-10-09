import React from 'react'
import { useSearchParams } from 'react-router'
import { FiMapPin, FiUsers, FiX } from 'react-icons/fi'
import { useGetPublicPropertiesQuery } from '../store/api/publicApi'
import StayCard from '../components/landing/StayCard'
import StateBlock from '../components/common/StateBlock'

const SORTS = [
  ['recommended', 'Recommended'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Top rated'],
]

// ====== All bookable stays, filtered by city, guests and sort (kept in the URL)
const Stays = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isLoading, error } = useGetPublicPropertiesQuery()
  const stays = data?.data || []
  const city = searchParams.get('city') || ''
  const guests = Number(searchParams.get('guests')) || 1
  const sort = searchParams.get('sort') || 'recommended'
  const cities = [...new Set(stays.map((s) => s.city))]

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const shown = stays
    .filter((s) => (!city || s.city === city) && s.maxGuests >= guests)
    .sort((a, b) => {
      if (sort === 'price_asc') return a.basePrice - b.basePrice
      if (sort === 'price_desc') return b.basePrice - a.basePrice
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0)
      return 0
    })

  const selectCls = 'h-11 rounded-xl bg-white border border-navy/10 px-3 text-[14px] text-navy outline-none cursor-pointer'

  return (
    <section className="container mx-auto max-w-[1200px] px-5 pt-8 pb-24">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">Stays</p>
      <h1 className="mt-2 text-[32px] sm:text-[40px] font-bold text-navy leading-tight">Find your next stay</h1>

      {/* ====== Filters ====== */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 backdrop-blur border border-white p-2">
        <label className="flex items-center gap-2 px-2">
          <FiMapPin className="text-navy/50" />
          <select value={city} onChange={(e) => setParam('city', e.target.value)} className={selectCls} aria-label="City">
            <option value="">Anywhere</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 px-2">
          <FiUsers className="text-navy/50" />
          <select value={guests} onChange={(e) => setParam('guests', e.target.value === '1' ? '' : e.target.value)} className={selectCls} aria-label="Guests">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'recommended' ? '' : e.target.value)} className={`${selectCls} ml-auto`} aria-label="Sort">
          {SORTS.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
        {(city || guests > 1) && (
          <button onClick={() => setSearchParams({}, { replace: true })} className="flex items-center gap-1 rounded-full bg-sky-3 px-3 py-2 text-[13px] text-navy cursor-pointer">
            Clear <FiX size={13} />
          </button>
        )}
      </div>

      <p className="mt-4 mb-6 text-[13px] text-navy/60">{shown.length} stay{shown.length === 1 ? '' : 's'}{city ? ` in ${city}` : ''}{guests > 1 ? ` for ${guests} guests` : ''}</p>

      <StateBlock isLoading={isLoading} error={error} isEmpty={!shown.length} emptyText="No stays match. Try another city or fewer guests.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => <StayCard key={s._id} stay={s} query={guests > 1 ? `?guests=${guests}` : ''} />)}
        </div>
      </StateBlock>
    </section>
  )
}

export default Stays
