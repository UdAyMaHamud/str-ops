import React from 'react'

// Dark hero band at the top of every role home; each role fills it differently
const HomeHero = ({ eyebrow, title, children, aside }) => {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-primary text-white px-6 sm:px-8 py-7">
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-white/5" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{eyebrow}</p>}
          <h2 className="mt-1.5 text-[24px] sm:text-[28px] font-bold leading-tight">{title}</h2>
          {children}
        </div>
        {aside && <div className="relative">{aside}</div>}
      </div>
    </section>
  )
}

// Small stat inside the hero
export const HeroStat = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 min-w-[130px]">
    <p className="text-[11px] text-white/65">{label}</p>
    <p className="mt-0.5 text-[22px] font-bold leading-tight tabular">{value}</p>
    {sub && <p className="text-[11px] text-white/55">{sub}</p>}
  </div>
)

export default HomeHero
