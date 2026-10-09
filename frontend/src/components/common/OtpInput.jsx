import React, { useRef } from 'react'

// Four boxes for the 4-digit code. Digits always fill left to right, so `value`
// stays a plain string ("57", "5712") and clearing a box never shifts the others.
const OtpInput = ({ value, onChange, length = 4 }) => {
  const refs = useRef([])
  // Latest value, updated immediately so fast typing never reads a stale render
  const valueRef = useRef(value)
  valueRef.current = value

  const emit = (next) => {
    valueRef.current = next
    onChange(next)
  }

  const focusBox = (index) => refs.current[Math.max(0, Math.min(index, length - 1))]?.focus()

  // Put one digit at the box index (or the first empty box if the user skipped ahead)
  const placeDigit = (index, digit) => {
    const current = valueRef.current
    const at = Math.min(index, current.length)
    emit((current.slice(0, at) + digit + current.slice(at + 1)).slice(0, length))
    focusBox(at + 1)
  }

  const handleKeyDown = (index, e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      placeDigit(index, e.key)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const current = valueRef.current
      const at = current[index] ? index : Math.min(index, current.length) - 1
      if (at < 0) return
      emit(current.slice(0, at))
      focusBox(at)
    } else if (e.key === 'ArrowLeft') {
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      focusBox(index + 1)
    }
  }

  // Paste, SMS autofill and mobile keyboards that skip keydown arrive here
  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return
    if (raw.length >= length) {
      emit(raw.slice(0, length))
      focusBox(length - 1)
      return
    }
    placeDigit(index, raw[raw.length - 1])
  }

  return (
    <div className="flex justify-between gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ''}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onChange={(e) => handleChange(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          className="h-16 w-full rounded-2xl border border-line bg-white text-center text-[26px] font-bold outline-none focus:border-accent tabular"
        />
      ))}
    </div>
  )
}

export default OtpInput
