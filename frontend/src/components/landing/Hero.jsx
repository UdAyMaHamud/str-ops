import React, { useState } from 'react'
import { FiMapPin, FiUsers, FiSearch, FiStar } from 'react-icons/fi'
import heroVilla from '../../assets/hero-villa.jpg'
import { imgUrl, money } from '../common/format'

const Hero = ({ stays, stats, onSearch }) => {
  const [city, setCity] = useState('')
  const [guests, setGuests] = useState('2')
  const cities = [...new Set(stays.map((s) => s.city))]
  const topRated = [...stays].filter((s) => s.rating).sort((a, b) => b.rating - a.rating)[0]
  const occGap = stats ? Math.round((stats.occupancy - stats.marketOccupancy) * 100) : null

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch({ city, guests: Number(guests) })
  }

  return (
    <section className="relative">
      <div className="container mx-auto max-w-[1200px] px-5 pt-8 md:pt-14 text-center">
        <h1 className="text-[38px] sm:text-[52px] lg:text-[60px] leading-[1.05] font-bold text-navy tracking-tight">
          Find the Stay Where <br className="hidden sm:block" /> Your Next Story Begins
        </h1>
        <p className="mt-4 mx-auto max-w-xl text-[15px] text-navy/65">
          Hand-picked short-term rentals, run by a team that answers fast, cleans to a checklist and prices every night with data.
        </p>

        {/* ====== Search ====== */}
        <form onSubmit={handleSearch} className="mt-7 mx-auto max-w-[620px] flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl sm:rounded-full bg-white/80 backdrop-blur border border-white p-2 shadow-[0_20px_50px_-25px_rgba(30,42,74,0.45)]">
          <label className="flex items-center gap-2 flex-1 px-3">
            <FiMapPin className="text-navy/50 shrink-0" />
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-10 bg-transparent text-[14px] text-navy outline-none cursor-pointer" aria-label="Where">
              <option value="">Anywhere</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 sm:w-40 px-3 sm:border-l border-navy/10">
            <FiUsers className="text-navy/50 shrink-0" />
            <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full h-10 bg-transparent text-[14px] text-navy outline-none cursor-pointer" aria-label="Guests">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <button className="h-11 px-6 rounded-xl sm:rounded-full bg-navy text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95">
            <FiSearch size={15} /> Start your search
          </button>
        </form>
      </div>

      {/* ====== Visual: villa + floating cards ====== */}
      <div className="relative container mx-auto max-w-[1100px] px-5 mt-12 md:mt-16">
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_40px_90px_-40px_rgba(30,42,74,0.55)]">
          <img src={heroVilla} alt="Modern villa with a pool" className="w-full h-[280px] sm:h-[420px] lg:h-[480px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/25 to-transparent" />
        </div>

        {stats && (
          <div className="hidden md:block absolute left-0 lg:-left-6 top-14 w-[210px] rounded-2xl bg-white/85 backdrop-blur border border-white p-4 text-left shadow-xl">
            <p className="text-[30px] font-bold text-navy leading-none">{Math.round(stats.occupancy * 100)}%</p>
            <p className="mt-1 text-[12px] font-semibold text-navy">Portfolio occupancy</p>
            <p className="text-[11px] text-navy/60">
              Last 30 days{occGap !== null ? `, ${occGap >= 0 ? '+' : ''}${occGap} pts vs local market` : ''}
            </p>
          </div>
        )}

        {stats && (
          <div className="hidden md:flex absolute left-6 lg:left-2 bottom-10 items-center gap-3 rounded-2xl bg-white/85 backdrop-blur border border-white px-4 py-3 shadow-xl">
            <div className="flex -space-x-2">
              {stays.slice(0, 3).map((s) => (
                <img key={s._id} src={imgUrl(s.image)} alt="" className="h-9 w-9 rounded-full object-cover border-2 border-white" />
              ))}
            </div>
            <div className="text-left">
              <p className="text-[18px] font-bold text-navy leading-none">{stats.properties} homes</p>
              <p className="text-[11px] text-navy/60">across {stats.cities} US cities</p>
            </div>
          </div>
        )}

        {topRated && (
          <div className="hidden md:block absolute right-0 lg:-right-6 top-10 w-[230px] rounded-2xl bg-white/85 backdrop-blur border border-white p-4 text-left shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/50">Top rated stay</p>
            <p className="mt-1 text-[15px] font-bold text-navy">{topRated.name}</p>
            <p className="flex items-center gap-1 text-[12px] text-navy/70">
              <FiStar className="fill-warning text-warning" size={12} /> {topRated.rating} · {topRated.reviewCount} reviews
            </p>
          </div>
        )}

        <div className="hidden md:flex absolute right-6 lg:right-2 bottom-8 flex-col gap-2 w-[250px]">
          {stays.slice(1, 3).map((s) => (
            <div key={s._id} className="flex items-center gap-3 rounded-2xl bg-white/85 backdrop-blur border border-white p-2 pr-3 shadow-xl">
              <img src={imgUrl(s.image)} alt="" className="h-11 w-11 rounded-xl object-cover" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-semibold text-navy truncate">{s.name}</p>
                <p className="text-[11px] text-navy/60 truncate">{s.city}, {s.state}</p>
              </div>
              <p className="text-[12px] font-bold text-navy">{money(s.basePrice)}<span className="font-normal text-navy/50">/nt</span></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
