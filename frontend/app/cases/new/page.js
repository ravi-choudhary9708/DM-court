'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const caseTypes = [
  { value: 'land_dispute', label: 'Land Dispute / भूमि विवाद', icon: '🌾' },
  { value: 'mutation', label: 'Mutation / दाखिल-खारिज', icon: '📝' },
  { value: 'arms_act', label: 'Arms Act / शस्त्र अधिनियम', icon: '🔫' },
  { value: 'excise', label: 'Excise / उत्पाद शुल्क', icon: '🍶' },
  { value: 'public_order', label: 'Public Order / लोक व्यवस्था', icon: '🚨' },
  { value: 'eviction', label: 'Eviction / बेदखली', icon: '🏠' },
  { value: 'succession', label: 'Succession / उत्तराधिकार', icon: '👨‍👩‍👦' },
  { value: 'other', label: 'Other / अन्य', icon: '📋' },
];

function FormSection({ title, children }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
      <h2 className="text-white font-semibold text-base mb-5 flex items-center gap-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FormField({ label, labelHindi, children }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm font-medium mb-2">
        {label} <span className="text-slate-500 font-normal">/ {labelHindi}</span>
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all';

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    caseNumber: '',
    caseType: 'land_dispute',
    subject: '',
    partyA: { name: '', address: '', contact: '', advocate: '' },
    partyB: { name: '', address: '', contact: '', advocate: '' },
    filedDate: new Date().toISOString().split('T')[0],
    district: '',
    policeStation: '',
    notes: '',
  });

  const setParty = (party, field, value) => {
    setForm((prev) => ({ ...prev, [party]: { ...prev[party], [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push(`/cases/${data.data._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white text-2xl font-bold">New Case / नया वाद</h1>
        <p className="text-slate-400 text-sm mt-1">Register a new case in the DM Court</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 text-red-300 text-sm flex items-center gap-2">
          <span>⚠</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Case Details */}
        <FormSection title="📋 Case Details / वाद विवरण">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Case Number" labelHindi="वाद संख्या">
              <input
                id="case-number"
                required
                placeholder="e.g. 124/2026"
                value={form.caseNumber}
                onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Filed Date" labelHindi="दाखिला तिथि">
              <input
                id="filed-date"
                type="date"
                required
                value={form.filedDate}
                onChange={(e) => setForm({ ...form, filedDate: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="mb-4">
            <FormField label="Subject" labelHindi="विषय">
              <input
                id="subject"
                required
                placeholder="Brief subject of the case..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="mb-4">
            <FormField label="Case Type" labelHindi="वाद प्रकार">
              <div className="grid grid-cols-4 gap-2">
                {caseTypes.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    id={`type-${ct.value}`}
                    onClick={() => setForm({ ...form, caseType: ct.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.caseType === ct.value
                        ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{ct.icon}</div>
                    <div className="text-xs leading-tight">{ct.label}</div>
                  </button>
                ))}
              </div>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="District" labelHindi="जिला">
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className={inputClass}
                placeholder="e.g. Patna"
              />
            </FormField>
            <FormField label="Police Station" labelHindi="थाना">
              <input
                value={form.policeStation}
                onChange={(e) => setForm({ ...form, policeStation: e.target.value })}
                className={inputClass}
                placeholder="e.g. Phulwari PS"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Party A */}
        <FormSection title="👤 Party A — Petitioner / वादी">
          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'name', label: 'Full Name', labelHindi: 'पूरा नाम', ph: 'Ram Kumar', id: 'pa-name' },
              { field: 'contact', label: 'Contact', labelHindi: 'संपर्क', ph: '9876543210', id: 'pa-contact' },
              { field: 'address', label: 'Address', labelHindi: 'पता', ph: 'Village, District, Bihar', id: 'pa-address' },
              { field: 'advocate', label: 'Advocate', labelHindi: 'अधिवक्ता', ph: 'Advocate name (optional)', id: 'pa-advocate' },
            ].map((f) => (
              <FormField key={f.field} label={f.label} labelHindi={f.labelHindi}>
                <input
                  id={f.id}
                  required={f.field === 'name'}
                  placeholder={f.ph}
                  value={form.partyA[f.field]}
                  onChange={(e) => setParty('partyA', f.field, e.target.value)}
                  className={inputClass}
                />
              </FormField>
            ))}
          </div>
        </FormSection>

        {/* Party B */}
        <FormSection title="👤 Party B — Respondent / प्रतिवादी">
          <div className="grid grid-cols-2 gap-4">
            {[
              { field: 'name', label: 'Full Name', labelHindi: 'पूरा नाम', ph: 'Shyam Lal', id: 'pb-name' },
              { field: 'contact', label: 'Contact', labelHindi: 'संपर्क', ph: '9876543210', id: 'pb-contact' },
              { field: 'address', label: 'Address', labelHindi: 'पता', ph: 'Village, District, Bihar', id: 'pb-address' },
              { field: 'advocate', label: 'Advocate', labelHindi: 'अधिवक्ता', ph: 'Advocate name (optional)', id: 'pb-advocate' },
            ].map((f) => (
              <FormField key={f.field} label={f.label} labelHindi={f.labelHindi}>
                <input
                  id={f.id}
                  required={f.field === 'name'}
                  placeholder={f.ph}
                  value={form.partyB[f.field]}
                  onChange={(e) => setParty('partyB', f.field, e.target.value)}
                  className={inputClass}
                />
              </FormField>
            ))}
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection title="📝 Additional Notes / अतिरिक्त नोट">
          <textarea
            id="notes"
            rows={3}
            placeholder="Any additional notes or remarks..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </FormSection>

        {/* Submit */}
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            id="submit-case-btn"
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Case...</>
            ) : (
              '✅ Create Case / वाद दर्ज करें'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
