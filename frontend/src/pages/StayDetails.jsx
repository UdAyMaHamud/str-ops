import React from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiCheck, FiMapPin, FiStar, FiUsers, FiHome, FiClock, FiInfo } from 'react-icons/fi'
import { useGetStayQuery, useGetQuoteQuery, useCreateBookingMutation } from '../store/api/bookingApi'
import { selectCurrentUser } from '../store/slices/authSlice'
import StateBlock from '../components/common/StateBlock'
import AvailabilityCalendar from '../components/stay/AvailabilityCalendar'
import SaveButton from '../components/stay/SaveButton'
import { imgUrl, money, fmtDate } from '../components/common/format'

const HOUSE_RULES = ['Check-in after 4 PM, self check-in', 'Checkout before 11 AM', 'No parties or events', 'No smoking inside', 'Quiet hours 10 PM to 8 AM']

const StayDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(selectCurrentUser)
  // Dates live in the URL so they survive sign-in and sharing
  const [searchParams, setSearchParams] = useSearchParams()
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const guests = Number(searchParams.get('guests')) || 2
  const [message, setMessage] = React.useState('')

  const { data, isLoading, error } = useGetStayQuery(id)
  const stay = data?.data
  const { data: quoteData, error: quoteError, isFetching: quoting } = useGetQuoteQuery(
    { property: id, checkIn, checkOut, guests },
    { skip: !checkIn || !checkOut }
  )
  const quote = quoteData?.data
  const [createBooking, { isLoading: booking }] = useCreateBookingMutation()

  const setParams = (values) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setSearchParams(next, { replace: true })
  }

  // ====== Request to book
  const handleBook = async () => {
    if (!user) return navigate('/signin', { state: { from: location } })
    if (user.role !== 'guest') return toast.error('Booking needs a guest account. Sign up with "Book stays".', { position: 'top-center' })
    try {
      const res = await createBooking({ property: id, checkIn, checkOut, guests, message }).unwrap()
      toast.success(res.message, { duration: 3500, position: 'top-center' })
      setTimeout(() => navigate('/trips'), 1200)
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <section className="container mx-auto max-w-[1200px] px-5 pt-6 pb-24">
      <Link to="/stays" className="inline-flex items-center gap-1.5 text-[13px] text-navy/60 hover:text-navy"><FiArrowLeft size={14} /> All stays</Link>

      <StateBlock isLoading={isLoading} error={error}>
        {stay && (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[30px] sm:text-[38px] font-bold text-navy leading-tight">{stay.name}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-navy/65">
                  <span className="flex items-center gap-1"><FiMapPin size={13} /> {stay.city}, {stay.state}</span>
                  {stay.rating && <span className="flex items-center gap-1"><FiStar size={13} className="fill-warning text-warning" /> {stay.rating} · {stay.reviewCount} reviews</span>}
                  <span className="flex items-center gap-1"><FiHome size={13} /> {stay.bedrooms} bedroom{stay.bedrooms > 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><FiUsers size={13} /> up to {stay.maxGuests} guests</span>
                </p>
              </div>
              <SaveButton propertyId={stay._id} className="border border-navy/10 h-11 w-11" />
            </div>

            <div className="mt-5 rounded-[28px] overflow-hidden">
              <img src={imgUrl(stay.image)} alt={stay.name} className="w-full h-[260px] sm:h-[440px] object-cover" />
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] items-start">
              <div className="space-y-10 min-w-0">
                <div>
                  <h2 className="text-[20px] font-bold text-navy">About this stay</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy/75">{stay.description}</p>
                </div>

                {stay.amenities?.length > 0 && (
                  <div>
                    <h2 className="text-[20px] font-bold text-navy">What this place offers</h2>
                    <ul className="mt-3 grid sm:grid-cols-2 gap-2.5">
                      {stay.amenities.map((a) => (
                        <li key={a} className="flex items-center gap-2.5 text-[14px] text-navy/80"><FiCheck className="text-[#2f7a50]" /> {a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h2 className="text-[20px] font-bold text-navy">Availability</h2>
                  <div className="mt-4 rounded-3xl border border-navy/8 bg-white p-5">
                    <AvailabilityCalendar calendar={stay.calendar} checkIn={checkIn} checkOut={checkOut} onChange={(v) => setParams(v)} />
                  </div>
                </div>

                <div>
                  <h2 className="text-[20px] font-bold text-navy">House rules</h2>
                  <ul className="mt-3 grid sm:grid-cols-2 gap-2.5">
                    {HOUSE_RULES.map((r) => <li key={r} className="flex items-center gap-2.5 text-[14px] text-navy/80"><FiClock className="text-navy/40" /> {r}</li>)}
                  </ul>
                </div>

                <div>
                  <h2 className="text-[20px] font-bold text-navy">{stay.reviewCount ? `${stay.rating} ★ · ${stay.reviewCount} reviews` : 'No reviews yet'}</h2>
                  <ul className="mt-4 grid sm:grid-cols-2 gap-4">
                    {stay.reviews.map((r) => (
                      <li key={r._id} className="rounded-2xl bg-white border border-navy/8 p-4">
                        <p className="flex items-center gap-1 text-[12px] text-navy/60">
                          {[1, 2, 3, 4, 5].map((n) => <FiStar key={n} size={12} className={n <= r.rating ? 'fill-warning text-warning' : 'text-navy/15'} />)}
                          <span className="ml-1">{new Date(r.postedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
                        </p>
                        <p className="mt-2 text-[14px] text-navy/80">{r.text}</p>
                        {r.reply && <p className="mt-2 border-l-2 border-navy/10 pl-3 text-[12px] text-navy/60"><span className="font-semibold">Host:</span> {r.reply}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ====== Booking box ====== */}
              <aside className="lg:sticky lg:top-6 rounded-3xl bg-white border border-navy/8 p-6 shadow-[0_30px_70px_-40px_rgba(30,42,74,0.55)]">
                <p className="text-[24px] font-bold text-navy">
                  {quote ? money(quote.avgNightly) : money(stay.basePrice)} <span className="text-[14px] font-normal text-navy/55">/ night{quote ? ' avg' : ' from'}</span>
                </p>
                <div className="mt-4 grid grid-cols-2 rounded-2xl border border-navy/12 overflow-hidden text-[13px]">
                  <div className="p-3 border-r border-navy/12">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy/50">Check-in</p>
                    <p className="text-navy">{checkIn ? fmtDate(checkIn) : 'Add date'}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy/50">Checkout</p>
                    <p className="text-navy">{checkOut ? fmtDate(checkOut) : 'Add date'}</p>
                  </div>
                  <label className="col-span-2 p-3 border-t border-navy/12">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-navy/50">Guests</span>
                    <select value={guests} onChange={(e) => setParams({ guests: e.target.value })} className="w-full bg-transparent text-navy outline-none cursor-pointer">
                      {Array.from({ length: stay.maxGuests }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </label>
                </div>
                {(checkIn || checkOut) && (
                  <button onClick={() => setParams({ checkIn: '', checkOut: '' })} className="mt-2 text-[12px] text-navy/60 underline cursor-pointer">Clear dates</button>
                )}

                {quoteError && <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-[13px] text-[#7a5200]">{quoteError?.data?.message || 'Those dates do not work'}</p>}

                {quote && !quoteError && (
                  <dl className="mt-4 space-y-1.5 text-[14px] text-navy/75">
                    <div className="flex justify-between"><dt>{money(quote.avgNightly)} × {quote.nights} nights</dt><dd>{money(quote.subtotal)}</dd></div>
                    <div className="flex justify-between"><dt>Cleaning fee</dt><dd>{money(quote.cleaningFee)}</dd></div>
                    <div className="flex justify-between border-t border-navy/10 pt-2 font-bold text-navy"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
                  </dl>
                )}

                {quote && !quoteError && (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Say hello and tell us about your trip (optional)"
                    className="mt-4 w-full rounded-xl border border-navy/12 px-3 py-2 text-[13px] text-navy outline-none focus:border-navy/40"
                  />
                )}

                <button
                  onClick={handleBook}
                  disabled={!quote || !!quoteError || quoting || booking}
                  className="mt-4 w-full h-12 rounded-xl bg-navy text-white text-[15px] font-semibold cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {booking ? 'Sending request...' : !checkIn || !checkOut ? 'Pick your dates' : user ? 'Request to book' : 'Sign in to book'}
                </button>
                <p className="mt-3 flex items-start gap-1.5 text-[12px] text-navy/55">
                  <FiInfo className="mt-0.5 shrink-0" size={12} /> You won't be charged now. Our team confirms your request within 24 hours. Free cancellation before check-in.
                </p>
              </aside>
            </div>
          </>
        )}
      </StateBlock>
    </section>
  )
}

export default StayDetails
