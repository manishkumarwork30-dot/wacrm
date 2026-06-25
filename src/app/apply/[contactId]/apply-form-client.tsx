'use client'

import React, { useState, useEffect } from 'react'
import { INDIA_STATES_AND_DISTRICTS } from '@/lib/india-data'

interface ApplyFormClientProps {
  initialData: {
    contactId: string
    name: string
    phone: string
    botPhone: string
  }
}

export default function ApplyFormClient({ initialData }: ApplyFormClientProps) {
  const [formData, setFormData] = useState({
    name: initialData.name,
    phone: initialData.phone,
    state: '',
    district: '',
    pincode: '',
    landSize: '',
    ownership: 'Self Owned',
    agree: false
  })

  const [districts, setDistricts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate districts when state changes
  useEffect(() => {
    if (formData.state && INDIA_STATES_AND_DISTRICTS[formData.state]) {
      setDistricts(INDIA_STATES_AND_DISTRICTS[formData.state])
      setFormData(prev => ({ ...prev, district: '' }))
    } else {
      setDistricts([])
    }
  }, [formData.state])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    if (name === 'pincode') {
      // Allow only numbers and max 6 digits
      const sanitized = value.replace(/\D/g, '').slice(0, 6)
      setFormData(prev => ({ ...prev, [name]: sanitized }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim() || !formData.state || !formData.district || !formData.pincode || !formData.landSize.trim()) {
      setError('Please fill in all details.')
      return
    }
    if (formData.pincode.length !== 6) {
      setError('Pincode must be exactly 6 digits.')
      return
    }
    if (!formData.agree) {
      setError('Please agree to the Terms & Conditions.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: initialData.contactId,
          name: formData.name,
          phone: formData.phone,
          state: formData.state,
          district: formData.district,
          pincode: formData.pincode,
          landSize: formData.landSize,
          ownership: formData.ownership
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit application. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (submitted && initialData.botPhone) {
      // Auto-redirect back to WhatsApp after 3 seconds
      const timer = setTimeout(() => {
        const text = encodeURIComponent('I have submitted my application online. Please check.');
        window.location.href = `whatsapp://send?phone=${initialData.botPhone}&text=${text}`;
        
        // Fallback if URL scheme fails
        setTimeout(() => {
          window.location.href = `https://wa.me/${initialData.botPhone}?text=${text}`;
        }, 1000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted, initialData.botPhone]);

  if (submitted) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center rounded-full text-3xl animate-bounce">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Form Submitted!</h1>
          <p className="text-emerald-400 font-medium">पंजीकरण सफलतापूर्वक पूरा हुआ</p>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
          Thank you, <span className="text-slate-200 font-semibold">{formData.name}</span>. Your details have been submitted for digital verification.
          <br /><br />
          कल सुबह <span className="text-indigo-400 font-semibold">9:00 AM से 1:00 PM</span> के बीच आपको WhatsApp पर आधिकारिक स्वीकृति PDF (Approval Letter) प्राप्त हो जाएगी।
        </p>
        <div className="pt-4">
          <button 
            onClick={() => {
              const text = encodeURIComponent('I have submitted my application online. Please check.');
              window.location.href = `whatsapp://send?phone=${initialData.botPhone}&text=${text}`;
            }} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition duration-200 shadow-lg shadow-primary/20"
          >
            Return to WhatsApp
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">HTL NETWORK</h1>
        <p className="text-indigo-400 text-sm font-semibold tracking-wide uppercase">4G / 5G Mobile Tower Application</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name (पूरा नाम)</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange}
            placeholder="Enter your name"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number (मोबाइल नंबर)</label>
          <input 
            type="tel" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange}
            placeholder="Mobile number"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">State (राज्य)</label>
            <select 
              name="state" 
              value={formData.state} 
              onChange={handleChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
            >
              <option value="">Select State</option>
              {Object.keys(INDIA_STATES_AND_DISTRICTS).sort().map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">District (जिला)</label>
            <select 
              name="district" 
              value={formData.district} 
              onChange={handleChange}
              required
              disabled={!formData.state}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition duration-200"
            >
              <option value="">Select District</option>
              {districts.sort().map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Area PIN Code (पिन कोड)</label>
          <input 
            type="text" 
            name="pincode" 
            value={formData.pincode} 
            onChange={handleChange}
            placeholder="6-digit PIN code"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Land Details & Size (जमीन का विवरण)</label>
          <input 
            type="text" 
            name="landSize" 
            value={formData.landSize} 
            onChange={handleChange}
            placeholder="e.g. 1500 sq ft, 1 Bigha, 20x50 ft"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Land Ownership (जमीन का स्वामित्व)</label>
          <select 
            name="ownership" 
            value={formData.ownership} 
            onChange={handleChange}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
          >
            <option value="Self Owned">Self Owned (खुद की जमीन)</option>
            <option value="Family Owned">Family Owned (पारिवारिक जमीन)</option>
            <option value="Joint Property">Joint Property (संयुक्त संपत्ति)</option>
            <option value="Leased">Leased (पट्टे पर)</option>
            <option value="Rented">Rented (किराए की)</option>
          </select>
        </div>

        <div className="flex items-start space-x-3 pt-2">
          <input 
            type="checkbox" 
            name="agree" 
            id="agree"
            checked={formData.agree}
            onChange={handleChange}
            className="mt-1 accent-indigo-500 rounded border-slate-800 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950 cursor-pointer"
          />
          <label htmlFor="agree" className="text-xs text-slate-400 leading-normal cursor-pointer select-none">
            I confirm that the above details are true. I agree to pay the registration fee of ₹2,550 once my location gets approved.
          </label>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:translate-y-[-1px] active:translate-y-[1px] transition-all duration-200 mt-2 flex items-center justify-center space-x-2 cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Submitting...</span>
            </>
          ) : (
            <span>Submit Application (आवेदन जमा करें)</span>
          )}
        </button>
      </form>
    </div>
  )
}
