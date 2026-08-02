'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, hasRole } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const CASE_TYPES = [
  { value: 'land_dispute',  label: 'Land Dispute / भूमि विवाद' },
  { value: 'mutation',      label: 'Mutation / दाखिल-खारिज' },
  { value: 'arms_act',      label: 'Arms Act / शस्त्र' },
  { value: 'excise',        label: 'Excise / उत्पाद' },
  { value: 'public_order',  label: 'Public Order / लोक व्यवस्था' },
  { value: 'eviction',      label: 'Eviction / बेदखली' },
  { value: 'succession',    label: 'Succession / उत्तराधिकार' },
  { value: 'other',         label: 'Other / अन्य' },
];

const ACTIONS = ['BLOCK_PROCEED', 'FLAG_INCOMPLETE', 'WARN', 'INFO'];
const CONDITION_TYPES = ['document_required', 'field_required', 'date_check', 'custom'];

const ACTION_COLORS = {
  BLOCK_PROCEED:  'bg-red-500/20 text-red-300 border-red-500/30',
  FLAG_INCOMPLETE:'bg-amber-500/20 text-amber-300 border-amber-500/30',
  WARN:           'bg-orange-500/20 text-orange-300 border-orange-500/30',
  INFO:           'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const inputCls = 'w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500';

const EMPTY_RULE = {
  ruleCode: '', description: '', descriptionHindi: '',
  caseTypes: [],
  condition: { type: 'document_required', documentType: '', party: 'A', field: '' },
  action: 'FLAG_INCOMPLETE',
  message: '', mandatory: true, jurisdiction: 'Bihar', isActive: true,
};

function RuleFormModal({ rule, onClose, onSaved }) {
  const [form, setForm] = useState(rule || EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!rule?._id;

  const toggleCaseType = (val) => {
    setForm((f) => ({
      ...f,
      caseTypes: f.caseTypes.includes(val)
        ? f.caseTypes.filter((t) => t !== val)
        : [...f.caseTypes, val],
    }));
  };

  const handleSave = async () => {
    if (!form.ruleCode || !form.description) {
      setError('Rule Code and Description are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `${API}/legal/rules/${rule._id}` : `${API}/legal/rules`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onSaved(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Rule' : 'New Legal Rule'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Rule Code *</label>
              <input id="rule-code" placeholder="RULE-001" value={form.ruleCode}
                onChange={(e) => setForm({ ...form, ruleCode: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Jurisdiction</label>
              <input placeholder="Bihar" value={form.jurisdiction}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Description (English) *</label>
            <input id="rule-description" placeholder="Rule description..." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Description (Hindi)</label>
            <input placeholder="नियम का विवरण..." value={form.descriptionHindi}
              onChange={(e) => setForm({ ...form, descriptionHindi: e.target.value })} className={inputCls} />
          </div>

          {/* Case types */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Applies to Case Types (empty = all)</label>
            <div className="flex flex-wrap gap-2">
              {CASE_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => toggleCaseType(ct.value)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    form.caseTypes.includes(ct.value)
                      ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                      : 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ct.label.split(' / ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <label className="text-slate-400 text-xs">Condition</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Condition Type</label>
                <select
                  value={form.condition.type}
                  onChange={(e) => setForm({ ...form, condition: { ...form.condition, type: e.target.value } })}
                  className={inputCls}
                >
                  {CONDITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.condition.type === 'document_required' && (
                <>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Party</label>
                    <select
                      value={form.condition.party}
                      onChange={(e) => setForm({ ...form, condition: { ...form.condition, party: e.target.value } })}
                      className={inputCls}
                    >
                      {['A', 'B', 'court', 'both'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-500 text-xs mb-1 block">Document Type</label>
                    <input
                      placeholder="e.g. jamabandi, police_report..."
                      value={form.condition.documentType}
                      onChange={(e) => setForm({ ...form, condition: { ...form.condition, documentType: e.target.value } })}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
              {form.condition.type === 'field_required' && (
                <div className="col-span-2">
                  <label className="text-slate-500 text-xs mb-1 block">Field Path</label>
                  <input
                    placeholder="e.g. subject, partyA.name, policeStation"
                    value={form.condition.field}
                    onChange={(e) => setForm({ ...form, condition: { ...form.condition, field: e.target.value } })}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action + Message */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Action on Failure</label>
              <select
                id="rule-action"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className={inputCls}
              >
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.mandatory}
                  onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-slate-300 text-sm">Mandatory</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-slate-300 text-sm">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Failure Message (shown to Peshkar)</label>
            <textarea
              rows={2}
              placeholder="Message to show when rule fails..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm">
            Cancel
          </button>
          <button
            id="save-rule-btn"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm"
          >
            {saving ? 'Saving…' : (isEdit ? 'Update Rule' : 'Create Rule')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseTypeFilter, setCaseTypeFilter] = useState('');
  const [modal, setModal] = useState({ open: false, rule: null });

  useEffect(() => {
    if (!hasRole('admin')) { router.push('/dashboard'); return; }
    fetchRules();
  }, [router]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/legal/rules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setRules(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r._id === saved._id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setModal({ open: false, rule: null });
  };

  const filteredRules = rules.filter((r) => {
    if (!caseTypeFilter) return true;
    return r.caseTypes.length === 0 || r.caseTypes.includes(caseTypeFilter);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Legal Rules / नियम</h1>
          <p className="text-slate-400 text-sm mt-1">Deterministic rule engine — zero AI involvement</p>
        </div>
        <button
          id="add-rule-btn"
          onClick={() => setModal({ open: true, rule: null })}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-amber-900/30"
        >
          ➕ New Rule
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          id="rule-case-type-filter"
          value={caseTypeFilter}
          onChange={(e) => setCaseTypeFilter(e.target.value)}
          className="bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Case Types</option>
          {CASE_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
        </select>
        <span className="text-slate-500 text-sm self-center">{filteredRules.length} rules</span>
      </div>

      {/* Rules table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-700/20 animate-pulse" />)}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm mb-2">No rules found.</p>
            <p className="text-slate-600 text-xs">Run <code className="bg-slate-800 px-1 rounded">npm run seed</code> to load Bihar DM Court rules.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-700/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-1">Code</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Case Types</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Edit</div>
            </div>
            {filteredRules.map((rule, idx) => (
              <div
                key={rule._id}
                className={`grid grid-cols-12 gap-4 px-5 py-4 items-center ${idx < filteredRules.length - 1 ? 'border-b border-slate-700/30' : ''} hover:bg-slate-700/10 transition-colors`}
              >
                <div className="col-span-1">
                  <span className="text-amber-400 text-xs font-mono">{rule.ruleCode}</span>
                </div>
                <div className="col-span-4">
                  <p className="text-white text-sm font-medium leading-snug">{rule.description}</p>
                  {rule.descriptionHindi && <p className="text-slate-500 text-xs mt-0.5">{rule.descriptionHindi}</p>}
                  {rule.message && <p className="text-slate-600 text-xs mt-1 italic truncate">{rule.message}</p>}
                </div>
                <div className="col-span-2">
                  {rule.caseTypes.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">All types</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {rule.caseTypes.map((ct) => (
                        <span key={ct} className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{ct}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-1 rounded-lg border ${ACTION_COLORS[rule.action] || ACTION_COLORS.INFO}`}>
                    {rule.action}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={`text-xs font-medium ${rule.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                    {rule.isActive ? '● Active' : '○ Off'}
                  </span>
                </div>
                <div className="col-span-2">
                  <button
                    id={`edit-rule-${rule.ruleCode}`}
                    onClick={() => setModal({ open: true, rule })}
                    className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-colors"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {modal.open && (
        <RuleFormModal
          rule={modal.rule}
          onClose={() => setModal({ open: false, rule: null })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
