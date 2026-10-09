import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useCreateEodMutation } from '../../store/api/trainingApi'

// ====== End-of-Day Report (workbook Section 03, format 1). Posting again the same day updates it.
const EodForm = ({ initial, defaultSubmitted = '', onDone }) => {
  const [formData, setFormData] = useState({
    hoursWorked: initial?.hoursWorked || 7,
    tasks: initial?.tasks || '',
    submitted: initial?.submitted || defaultSubmitted,
    learned: initial?.learned?.length === 3 ? initial.learned : ['', '', ''],
    blocker: initial?.blocker || '',
    question: initial?.question || '',
    confidence: initial?.confidence || 3,
    tomorrowCardRead: initial?.tomorrowCardRead || false,
  })
  const [errors, setErrors] = useState('')
  const [createEod, { isLoading }] = useCreateEodMutation()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors('')
  }

  const handleLearned = (i, value) => {
    setFormData((prev) => ({ ...prev, learned: prev.learned.map((l, k) => (k === i ? value : l)) }))
    setErrors('')
  }

  // ====== Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.tasks.trim()) return setErrors('Write how each task went (done / partly).')
    if (formData.learned.some((l) => !l.trim())) return setErrors('Write 3 things you learned.')

    try {
      const res = await createEod(formData).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      onDone?.()
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[12px] font-medium">{errors}</p>}
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <div>
          <label className={labelCls} htmlFor="hoursWorked">Hours</label>
          <input id="hoursWorked" name="hoursWorked" type="number" min="1" max="16" value={formData.hoursWorked} onChange={handleChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="tasks">Tasks done</label>
          <input id="tasks" name="tasks" value={formData.tasks} onChange={handleChange} placeholder="1 done / 2 done / 3 partly" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="submitted">Submitted</label>
        <input id="submitted" name="submitted" value={formData.submitted} onChange={handleChange} placeholder="File name(s)" className={inputCls} />
      </div>
      <div>
        <p className={labelCls}>3 things I learned</p>
        <div className="space-y-1.5">
          {formData.learned.map((l, i) => (
            <input key={i} value={l} onChange={(e) => handleLearned(i, e.target.value)} placeholder={`${i + 1}.`} aria-label={`Learned ${i + 1}`} className={inputCls} />
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="blocker">Blocker (if any)</label>
          <input id="blocker" name="blocker" value={formData.blocker} onChange={handleChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="question">1 question for tomorrow</label>
          <input id="question" name="question" value={formData.question} onChange={handleChange} className={inputCls} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={labelCls}>Confidence today</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setFormData((p) => ({ ...p, confidence: n }))}
                aria-pressed={formData.confidence === n}
                className={`h-9 w-9 rounded-xl text-[13px] font-bold cursor-pointer active:scale-95 ${formData.confidence === n ? 'bg-primary text-white' : 'bg-mint text-ink-2'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-ink-2 cursor-pointer">
          <input type="checkbox" name="tomorrowCardRead" checked={formData.tomorrowCardRead} onChange={handleChange} className="accent-[#1f4a35]" />
          Tomorrow's Day Card read
        </label>
      </div>
      <button disabled={isLoading} className="w-full h-11 rounded-full bg-primary text-white text-[13px] font-semibold cursor-pointer active:scale-95 disabled:opacity-60">
        {isLoading ? 'Posting...' : initial ? 'Update EOD report' : 'Post EOD report'}
      </button>
    </form>
  )
}

export default EodForm
