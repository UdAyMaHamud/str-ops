import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { useCreatePropertyMutation } from '../store/api/overviewApi'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'

const CHANNELS = ['Airbnb', 'VRBO', 'Booking.com', 'Direct']
const TIMEZONES = [
  ['America/New_York', 'Eastern'],
  ['America/Chicago', 'Central'],
  ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'],
  ['America/Los_Angeles', 'Pacific'],
]
const EMPTY_FORM = {
  name: '', city: '', state: '', timezone: 'America/New_York', bedrooms: '2',
  basePrice: '', minPrice: '', maxPrice: '', cleaningFee: '', channels: ['Airbnb'], description: '',
}

const AddProperty = () => {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState('')
  const [createProperty, { isLoading }] = useCreatePropertyMutation()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors('')
  }

  const toggleChannel = (channel) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel) ? prev.channels.filter((c) => c !== channel) : [...prev.channels, channel],
    }))
  }

  // ====== Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return setErrors('Property name is required.')
    if (!formData.city.trim() || !formData.state.trim()) return setErrors('City and state are required.')
    if (!Number(formData.basePrice)) return setErrors('Base nightly price is required.')
    if (formData.minPrice && Number(formData.minPrice) > Number(formData.basePrice)) return setErrors('Min price must be below the base price.')
    if (formData.maxPrice && Number(formData.maxPrice) < Number(formData.basePrice)) return setErrors('Max price must be above the base price.')

    try {
      const res = await createProperty(formData).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setTimeout(() => navigate('/dashboard/listings'), 800)
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  const inputCls = 'w-full h-11 rounded-xl border border-line bg-white px-3.5 text-[14px] outline-none focus:border-accent'
  const labelCls = 'block text-[12px] font-semibold text-ink-2 mb-1.5'

  return (
    <>
      <PageHeader title="Add a property" subtitle="Tell us the basics. Our team audits the listing and sets up the pricing calendar." />
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_340px] items-start">
        <Panel title="Property details">
          {errors && <p className="mb-4 bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="name">Property name</label>
              <input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sunset Cottage" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="city">City</label>
              <input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="San Diego" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="state">State</label>
                <input id="state" name="state" maxLength={2} value={formData.state} onChange={handleChange} placeholder="CA" className={`${inputCls} uppercase`} />
              </div>
              <div>
                <label className={labelCls} htmlFor="bedrooms">Bedrooms</label>
                <input id="bedrooms" name="bedrooms" type="number" min="1" value={formData.bedrooms} onChange={handleChange} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="timezone">Time zone</label>
              <select id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} className={`${inputCls} cursor-pointer`}>
                {TIMEZONES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cleaningFee">Cleaning fee ($)</label>
              <input id="cleaningFee" name="cleaningFee" type="number" min="0" value={formData.cleaningFee} onChange={handleChange} placeholder="90" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="description">Short description</label>
              <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Who is it for, what makes it special, where it is" className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-accent" />
            </div>
            <div className="sm:col-span-2">
              <p className={labelCls}>Where is it listed?</p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChannel(c)}
                    className={`rounded-full px-4 py-2 text-[13px] border cursor-pointer active:scale-95 ${formData.channels.includes(c) ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink-2'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Pricing" source="Starting point for the 60-day calendar" rule="Min and max protect you: prices never go outside them without asking you.">
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="basePrice">Base price per night ($)</label>
                <input id="basePrice" name="basePrice" type="number" min="1" value={formData.basePrice} onChange={handleChange} placeholder="200" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="minPrice">Min ($)</label>
                  <input id="minPrice" name="minPrice" type="number" min="1" value={formData.minPrice} onChange={handleChange} placeholder="auto" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="maxPrice">Max ($)</label>
                  <input id="maxPrice" name="maxPrice" type="number" min="1" value={formData.maxPrice} onChange={handleChange} placeholder="auto" className={inputCls} />
                </div>
              </div>
            </div>
          </Panel>
          <button disabled={isLoading} className="w-full h-12 rounded-full bg-primary text-white font-semibold cursor-pointer active:scale-95 disabled:opacity-60">
            {isLoading ? 'Adding...' : 'Add property'}
          </button>
        </div>
      </form>
    </>
  )
}

export default AddProperty
