import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, Eye, Loader2, Plus } from 'lucide-react';
import { createRecruitmentCase, fetchRecruitmentCase, fetchRecruitmentCases } from '../../services/recruitmentService';

const STAGES = [
  ['application_screening', 'Application Screening'], ['first_interview', 'First Interview'], ['head_review', 'Head Review'],
  ['second_interview', 'Second Interview'], ['practical_test', 'Practical Test'], ['test_review', 'Test Review'],
  ['final_interview', 'Final Interview'], ['reference_check', 'Reference Check'], ['hr_alignment', 'HR Alignment'],
  ['final_approval', 'Final Approval'], ['offer', 'Offer'], ['onboarding', 'Onboarding'], ['closed', 'Closed']
];

export function RecruitmentSection({ user, onNotify }) {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ candidateName: '', position: '', department: user?.department || '', selectedStages: STAGES.map(([value]) => value) });

  const load = async () => {
    try { setRecords(await fetchRecruitmentCases()); } catch (error) { onNotify?.(error.message, 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openRecord = async (id) => {
    try { setSelected(await fetchRecruitmentCase(id)); } catch (error) { onNotify?.(error.message, 'error'); }
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await createRecruitmentCase(form);
      setForm((current) => ({ ...current, candidateName: '', position: '' }));
      await load();
      onNotify?.('Recruitment record saved.', 'success');
    } catch (error) { onNotify?.(error.message, 'error'); }
  };
  const toggleStage = (value) => setForm((current) => ({ ...current, selectedStages: current.selectedStages.includes(value) ? current.selectedStages.filter((item) => item !== value) : [...current.selectedStages, value] }));

  return <section className="section-card">
    <div className="section-header"><div><h2><BriefcaseBusiness size={21} /> People &amp; Recruitment</h2><p>Department-controlled interview workflow with access notifications and audit logging.</p></div></div>
    <form onSubmit={submit} className="modal-form-section">
      <div className="form-grid">
        <label className="form-group">Candidate name<input required maxLength={160} value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} /></label>
        <label className="form-group">Position<input required maxLength={160} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>
        <label className="form-group col-span-2">Department<input required maxLength={120} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{STAGES.map(([value, label]) => <label key={value} className="status-badge" style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.selectedStages.includes(value)} onChange={() => toggleStage(value)} /> {label}</label>)}</div>
      <div style={{ textAlign: 'right', marginTop: 14 }}><button className="btn btn-primary" type="submit"><Plus size={15} /> Add candidate</button></div>
    </form>
    {loading ? <div className="empty-state"><Loader2 className="animate-spin" /> Loading…</div> : <div className="table-container"><table><thead><tr><th>Candidate</th><th>Position</th><th>Department</th><th>Current stage</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td>{record.candidateName}</td><td>{record.position}</td><td>{record.department}</td><td>{STAGES.find(([value]) => value === record.currentStage)?.[1] || record.currentStage}</td><td><button type="button" className="btn btn-outline btn-sm" onClick={() => openRecord(record._id)}><Eye size={14} /> View</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal-card" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><h3>{selected.candidateName}</h3><p>{selected.position} · {selected.department}</p></div><button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Close</button></div><div className="modal-form-section"><strong>Selected interview process</strong><ol>{selected.selectedStages.map((stage) => <li key={stage}>{STAGES.find(([value]) => value === stage)?.[1] || stage}</li>)}</ol></div></div></div>}
  </section>;
}
