import React, { useState } from 'react'
import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiCalendar, FiStar, FiUsers } from 'react-icons/fi'
import { useGetMyBookingsQuery, useCancelBookingMutation, useReviewBookingMutation } from '../store/api/bookingApi'
import { selectCurrentUser } from '../store/slices/authSlice'
import StateBlock from '../components/common/StateBlock'
import { imgUrl, money, fmtDate } from '../components/common/format'

const STATUS = {
  pending: ['Requested', 'bg-amber-100 text-[#7a5200]'],
  confirmed: ['Confirmed', 'bg-[#dcebe0] text-[#1d7a3a]'],
  cancelled: ['Cancelled', 'bg-navy/5 text-navy/50'],
}

const TABS = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
  ['cancelled', 'Cancelled'],
]

// ====== Guest: all my bookings on our site
const Trips = () => {
  const user = useSelector(selectCurrentUser)
  const [tab, setTab] = useState('upcoming')
  const { data, isLoading, error } = useGetMyBookingsQuery()
  const trips = data?.data || []
  const today = new Date().toISOString().slice(0, 10)

  const groups = {
    upcoming: trips.filter((t) => t.status !== 'cancelled' && t.checkOut.slice(0, 10) > today).reverse(),
    past: trips.filter((t) => t.status === 'confirmed' && t.checkOut.slice(0, 10) <= today),
    cancelled: trips.filter((t) => t.status === 'cancelled'),
  }

  return (
    <section className="container mx-auto max-w-[1000px] px-5 pt-8 pb-24">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">Hi {user?.fullName?.split(' ')[0]}</p>
      <h1 className="mt-2 text-[32px] sm:text-[40px] font-bold text-navy leading-tight">My trips</h1>

      <div className="mt-6 flex gap-1 rounded-2xl bg-white/70 border border-white p-1 w-fit" role="tablist">
        {TABS.map(([key, name]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 h-10 rounded-xl text-[13px] font-semibold cursor-pointer ${tab === key ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}
          >
            {name} <span className="opacity-60">({groups[key].length})</span>
          </button>
        ))}
      </div>

      <StateBlock
        isLoading={isLoading}
        error={error}
        isEmpty={!groups[tab].length}
        emptyText={tab === 'upcoming' ? 'No upcoming trips yet. Find a stay you love.' : 'Nothing here yet.'}
      >
        <ul className="mt-6 space-y-4">
          {groups[tab].map((t) => <TripCard key={t._id} trip={t} />)}
        </ul>
      </StateBlock>

      {tab === 'upcoming' && !groups.upcoming.length && !isLoading && (
        <Link to="/stays" className="mt-4 inline-block rounded-xl bg-navy text-white px-5 py-3 text-[14px] font-semibold">Browse stays</Link>
      )}
    </section>
  )
}

const TripCard = ({ trip: t }) => {
  const [cancelBooking, { isLoading: cancelling }] = useCancelBookingMutation()
  const [reviewBooking, { isLoading: reviewing }] = useReviewBookingMutation()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [status, statusCls] = STATUS[t.status]

  const handleCancel = async () => {
    if (!window.confirm(`Cancel your stay at ${t.property?.name}?`)) return
    try {
      const res = await cancelBooking(t._id).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (text.trim().length < 10) return toast.error('Write at least a sentence', { position: 'top-center' })
    try {
      const res = await reviewBooking({ id: t._id, rating, text }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <li className="rounded-3xl bg-white border border-navy/8 overflow-hidden shadow-[0_20px_50px_-40px_rgba(30,42,74,0.5)]">
      <div className="grid sm:grid-cols-[200px_1fr]">
        <Link to={`/stays/${t.property?._id}`} className="block h-40 sm:h-full">
          <img src={imgUrl(t.property?.image)} alt={t.property?.name} className="h-full w-full object-cover" />
        </Link>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link to={`/stays/${t.property?._id}`} className="text-[18px] font-bold text-navy hover:underline">{t.property?.name}</Link>
              <p className="text-[13px] text-navy/60">{t.property?.city}, {t.property?.state} · <span className="font-mono">{t.code}</span></p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusCls}`}>{status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-navy/75">
            <span className="flex items-center gap-1.5"><FiCalendar size={13} /> {fmtDate(t.checkIn)} → {fmtDate(t.checkOut)} · {t.nights} nights</span>
            <span className="flex items-center gap-1.5"><FiUsers size={13} /> {t.guests} guest{t.guests > 1 ? 's' : ''}</span>
            <span className="font-semibold text-navy">{money(t.total)}</span>
          </div>
          {t.status === 'pending' && <p className="mt-3 text-[12px] text-navy/55">Waiting for our team to confirm (usually within 24 hours). You have not been charged.</p>}

          {t.canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="mt-4 rounded-xl border border-navy/15 px-4 py-2 text-[13px] font-semibold text-navy hover:bg-navy/5 cursor-pointer disabled:opacity-50">
              {cancelling ? 'Cancelling...' : t.status === 'pending' ? 'Withdraw request' : 'Cancel stay'}
            </button>
          )}

          {t.review && (
            <p className="mt-4 rounded-2xl bg-sky-3/60 px-4 py-3 text-[13px] text-navy/80">
              <span className="font-semibold">Your review: {t.review.rating}★</span> {t.review.text}
            </p>
          )}

          {t.canReview && (
            <form onSubmit={handleReview} className="mt-4 rounded-2xl border border-navy/10 p-4">
              <p className="text-[14px] font-semibold text-navy">How was your stay?</p>
              <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className="cursor-pointer">
                    <FiStar size={22} className={n <= rating ? 'fill-warning text-warning' : 'text-navy/20'} />
                  </button>
                ))}
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What did you love? What could be better?" className="mt-3 w-full rounded-xl border border-navy/12 px-3 py-2 text-[13px] text-navy outline-none focus:border-navy/40" />
              <button disabled={reviewing} className="mt-2 rounded-xl bg-navy text-white px-4 py-2 text-[13px] font-semibold cursor-pointer active:scale-95 disabled:opacity-50">
                {reviewing ? 'Posting...' : 'Post review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  )
}

export default Trips
