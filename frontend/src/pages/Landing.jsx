import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  FiMessageCircle, FiCheckSquare, FiTrendingUp, FiShield, FiTool, FiFileText, FiArrowRight,
} from 'react-icons/fi'
import { useGetPublicPropertiesQuery, useGetPublicStatsQuery } from '../store/api/publicApi'
import Hero from '../components/landing/Hero'
import StayCard from '../components/landing/StayCard'
import StateBlock from '../components/common/StateBlock'
import forestCabin from '../assets/forest-cabin.jpg'
import interiorBright from '../assets/interior-bright.jpg'
import villaPool from '../assets/villa-pool.jpg'

const SERVICES = [
  { icon: FiMessageCircle, title: 'Guest messaging, 24/7', text: 'Fast, warm replies from booking to checkout. Every message checked before it is sent.' },
  { icon: FiCheckSquare, title: 'Cleaning with photo QC', text: 'Every turnover is photographed room by room and checked before the next guest arrives.' },
  { icon: FiTrendingUp, title: 'Dynamic pricing', text: 'Prices reviewed weekly against local events, gap nights and nearby listings.' },
  { icon: FiShield, title: 'Guest screening', text: 'Risky bookings are reviewed by a person, not just a score, before anyone checks in.' },
  { icon: FiTool, title: 'Maintenance handled', text: 'Issues become tickets with a vendor, a time frame and updates for the guest.' },
  { icon: FiFileText, title: 'One-page owner report', text: 'Revenue, occupancy and what happens next month, in a report you can read in a minute.' },
]

const STEPS = [
  { n: '01', title: 'Create your account', text: 'Sign up with Gmail or email in under a minute.' },
  { n: '02', title: 'Add your property', text: 'Tell us the basics. We audit the listing and set up pricing.' },
  { n: '03', title: 'Watch it perform', text: 'Follow bookings, revenue and reviews live on your dashboard.' },
]

const Landing = () => {
  const { data, isLoading, error } = useGetPublicPropertiesQuery()
  const { data: statsData } = useGetPublicStatsQuery()
  const navigate = useNavigate()
  const stays = data?.data || []
  const stats = statsData?.data

  const shown = stays.slice(0, 4)

  // Hero search opens the full stays list with the filters in the URL
  const handleSearch = ({ city, guests }) => {
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (guests > 1) params.set('guests', guests)
    navigate(`/stays${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <>
      <Hero stays={stays} stats={stats} onSearch={handleSearch} />

      {/* ====== Featured stays ====== */}
      <section id="stays" className="container mx-auto max-w-[1200px] px-5 pt-24 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">Featured stays</p>
            <h2 className="mt-2 text-[30px] sm:text-[36px] font-bold text-navy leading-tight">Homes guests come back to</h2>
          </div>
          <Link to="/stays" className="flex items-center gap-1 rounded-full bg-navy text-white px-4 py-2 text-[13px] font-semibold">All stays <FiArrowRight size={13} /></Link>
        </div>
        <StateBlock isLoading={isLoading} error={error} isEmpty={!shown.length} emptyText="No stays are live yet">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((s) => <StayCard key={s._id} stay={s} />)}
          </div>
        </StateBlock>
      </section>

      {/* ====== For owners ====== */}
      <section id="owners" className="container mx-auto max-w-[1200px] px-5 pt-28 scroll-mt-6">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div className="relative">
            <img src={forestCabin} alt="Cabin in a forest" className="w-full h-[420px] object-cover rounded-[32px]" />
            <img src={interiorBright} alt="Bright living room" className="hidden sm:block absolute -bottom-8 -right-4 w-48 h-36 object-cover rounded-3xl border-4 border-white shadow-xl" />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">For property owners</p>
            <h2 className="mt-2 text-[30px] sm:text-[38px] font-bold text-navy leading-tight">Own a rental? We run it. You watch it grow.</h2>
            <p className="mt-3 text-[15px] text-navy/65 max-w-lg">
              Our operations team handles guests, cleaning, pricing and maintenance. Your dashboard shows every booking, every dollar and every review as it happens.
            </p>
            <ol className="mt-7 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="h-11 w-11 shrink-0 rounded-2xl bg-sky-3 text-navy font-bold flex items-center justify-center text-[14px]">{s.n}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-navy">{s.title}</p>
                    <p className="text-[13px] text-navy/60">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link to="/register?as=owner" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy text-white px-5 py-3 text-[14px] font-semibold active:scale-95">
              Create owner account <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Services ====== */}
      <section id="services" className="container mx-auto max-w-[1200px] px-5 pt-28 scroll-mt-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">What we handle</p>
          <h2 className="mt-2 text-[30px] sm:text-[36px] font-bold text-navy leading-tight">Everything between the booking and the five-star review</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-navy/8 bg-white p-6 hover:shadow-[0_20px_50px_-35px_rgba(30,42,74,0.5)] transition-shadow">
              <span className="h-11 w-11 rounded-2xl bg-sky-1 text-navy flex items-center justify-center"><Icon size={18} /></span>
              <h3 className="mt-4 text-[16px] font-bold text-navy">{title}</h3>
              <p className="mt-1.5 text-[13px] text-navy/65">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== CTA band ====== */}
      <section className="container mx-auto max-w-[1200px] px-5 py-28">
        <div className="relative overflow-hidden rounded-[32px] bg-navy text-white px-8 py-14 sm:px-14">
          <img src={villaPool} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="relative max-w-xl">
            <h2 className="text-[30px] sm:text-[38px] font-bold leading-tight">Ready to put your property to work?</h2>
            <p className="mt-3 text-[15px] text-white/75">Join with your Gmail account and add your first property today.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register?as=owner" className="rounded-xl bg-white text-navy px-5 py-3 text-[14px] font-semibold active:scale-95">List your property</Link>
              <Link to="/signin" className="rounded-xl border border-white/30 px-5 py-3 text-[14px] font-medium hover:bg-white/10">I already have an account</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Landing
