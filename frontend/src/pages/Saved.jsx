import React from 'react'
import { Link } from 'react-router'
import { useGetWishlistQuery } from '../store/api/bookingApi'
import StayCard from '../components/landing/StayCard'
import StateBlock from '../components/common/StateBlock'

// ====== Guest: stays saved with the heart
const Saved = () => {
  const { data, isLoading, error } = useGetWishlistQuery()
  const items = data?.data || []

  return (
    <section className="container mx-auto max-w-[1200px] px-5 pt-8 pb-24">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-navy/50">Saved</p>
      <h1 className="mt-2 text-[32px] sm:text-[40px] font-bold text-navy leading-tight">Stays you love</h1>
      <div className="mt-8">
        <StateBlock isLoading={isLoading} error={error} isEmpty={!items.length} emptyText="Tap the heart on any stay to save it here.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((w) => <StayCard key={w._id} stay={{ ...w.property, maxGuests: w.property.maxGuests || w.property.bedrooms * 2 }} />)}
          </div>
        </StateBlock>
      </div>
      {!items.length && !isLoading && <Link to="/stays" className="mt-4 inline-block rounded-xl bg-navy text-white px-5 py-3 text-[14px] font-semibold">Browse stays</Link>}
    </section>
  )
}

export default Saved
