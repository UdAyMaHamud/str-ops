import React, { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const dayKey = (date) => new Date(date).toISOString().slice(0, 10)

// ====== Two-month date picker: booked nights are crossed out, each open night shows its price
const AvailabilityCalendar = ({ calendar, checkIn, checkOut, onChange }) => {
  const byKey = {}
  calendar.forEach((n) => (byKey[dayKey(n.date)] = n))
  const first = new Date(calendar[0]?.date || Date.now())
  const lastKey = dayKey(calendar[calendar.length - 1]?.date || Date.now())
  const [offset, setOffset] = useState(0)

  // Every night from check-in up to (not including) the candidate check-out must be open
  const rangeOpen = (fromKey, toKey) => {
    for (let d = new Date(fromKey); dayKey(d) < toKey; d.setUTCDate(d.getUTCDate() + 1)) {
      if (!byKey[dayKey(d)]?.available) return false
    }
    return true
  }

  const handlePick = (key) => {
    const night = byKey[key]
    if (!checkIn || checkOut || key <= checkIn) {
      if (!night?.available) return
      onChange({ checkIn: key, checkOut: '' })
      return
    }
    if (rangeOpen(checkIn, key)) onChange({ checkIn, checkOut: key })
    else if (night?.available) onChange({ checkIn: key, checkOut: '' })
  }

  const months = [0, 1].map((m) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset + m, 1)))
  const maxOffset = 4

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} className="h-8 w-8 rounded-full border border-line flex items-center justify-center cursor-pointer disabled:opacity-30" aria-label="Previous month">
          <FiChevronLeft />
        </button>
        <p className="text-[12px] text-muted">{checkIn && !checkOut ? 'Now pick your check-out date' : 'Pick your check-in date'}</p>
        <button type="button" onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))} disabled={offset === maxOffset} className="h-8 w-8 rounded-full border border-line flex items-center justify-center cursor-pointer disabled:opacity-30" aria-label="Next month">
          <FiChevronRight />
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {months.map((month) => {
          const startPad = month.getUTCDay()
          const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
          return (
            <div key={month.toISOString()}>
              <p className="text-center text-[14px] font-bold text-navy mb-2">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((w, i) => <span key={i} className="text-[10px] font-semibold text-navy/40 pb-1">{w}</span>)}
                {Array.from({ length: startPad }, (_, i) => <span key={`pad${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i + 1))
                  const key = dayKey(date)
                  const night = byKey[key]
                  const outside = !night && key > lastKey
                  const past = !night && !outside
                  const isStart = key === checkIn
                  const isEnd = key === checkOut
                  const inRange = checkIn && checkOut && key > checkIn && key < checkOut
                  // A booked night can still be someone's check-out day
                  const canBeCheckout = checkIn && !checkOut && key > checkIn && rangeOpen(checkIn, key)
                  const clickable = !past && !outside && (night?.available || canBeCheckout)
                  return (
                    <button
                      type="button"
                      key={key}
                      data-date={key}
                      disabled={!clickable}
                      onClick={() => handlePick(key)}
                      title={night ? `${night.available ? `$${night.price}` : 'Booked'}${night.minStay > 1 ? ` · min ${night.minStay} nights` : ''}` : ''}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center leading-none text-[12px] ${
                        isStart || isEnd
                          ? 'bg-navy text-white font-bold'
                          : inRange
                            ? 'bg-sky-3 text-navy'
                            : clickable
                              ? 'hover:bg-sky-3 text-navy cursor-pointer'
                              : 'text-navy/25 line-through'
                      }`}
                    >
                      <span>{i + 1}</span>
                      {night?.available && !isStart && !isEnd && <span className={`mt-0.5 text-[9px] ${inRange ? 'text-navy/70' : 'text-navy/45'}`}>${night.price}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AvailabilityCalendar
