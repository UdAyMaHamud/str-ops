import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuditPropertyMutation } from '../../store/api/overviewApi'

// ====== Listing Audit Checklist (Section 05 B): 8 checks scored 0, 1 or 2
const AuditForm = ({ property, checks, onDone }) => {
  const [scores, setScores] = useState(property.audit?.scores?.length === checks.length ? property.audit.scores : checks.map(() => null))
  const [amenities, setAmenities] = useState((property.audit?.missingAmenities || []).join(', '))
  const [marketOccupancy, setMarketOccupancy] = useState(property.marketOccupancy ? Math.round(property.marketOccupancy * 100) : '')
  const [marketAdr, setMarketAdr] = useState(property.marketAdr || '')
  const [errors, setErrors] = useState('')
  const [auditProperty, { isLoading }] = useAuditPropertyMutation()

  // ====== Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (scores.some((s) => s === null)) return setErrors('Score every check.')

    try {
      const res = await auditProperty({
        id: property._id,
        scores,
        missingAmenities: amenities.split(',').map((a) => a.trim()).filter(Boolean),
        marketOccupancy: marketOccupancy ? Number(marketOccupancy) / 100 : undefined,
        marketAdr: marketAdr ? Number(marketAdr) : undefined,
      }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
      onDone?.()
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  const total = scores.reduce((s, n) => s + (n || 0), 0)
  const inputCls = 'w-full h-10 rounded-xl border border-line bg-white px-3 text-[13px] outline-none focus:border-accent'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[12px] font-medium">{errors}</p>}
      <ol className="space-y-1.5">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex-1 text-[12px] text-ink-2">{c}</span>
            <div className="flex gap-1 shrink-0" role="radiogroup" aria-label={`Check ${i + 1}`}>
              {[0, 1, 2].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={scores[i] === n}
                  onClick={() => { setScores((prev) => prev.map((s, k) => (k === i ? n : s))); setErrors('') }}
                  className={`h-7 w-7 rounded-lg text-[12px] font-bold cursor-pointer ${scores[i] === n ? 'bg-primary text-white' : 'bg-mint text-ink-2'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Missing amenity tags, comma separated" className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="1" max="100" value={marketOccupancy} onChange={(e) => setMarketOccupancy(e.target.value)} placeholder="Market occupancy %" className={inputCls} />
        <input type="number" min="1" value={marketAdr} onChange={(e) => setMarketAdr(e.target.value)} placeholder="Market ADR $" className={inputCls} />
      </div>
      <button disabled={isLoading} className="w-full h-10 rounded-full bg-primary text-white text-[13px] font-semibold cursor-pointer active:scale-95 disabled:opacity-60">
        {isLoading ? 'Saving...' : `Save audit (${total}/${checks.length * 2})`}
      </button>
    </form>
  )
}

export default AuditForm
