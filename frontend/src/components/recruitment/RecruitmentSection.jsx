import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Eye, Loader2, Plus, Users } from 'lucide-react';
import { createRecruitmentCase, fetchRecruitmentCase, fetchRecruitmentCases, updateRecruitmentCase } from '../../services/recruitmentService';

const BUSINESS_UNITS = ['KBZ Bank', 'KBZPay', 'Comms', 'Creative', 'Research', 'Other'];
const INTERVIEWERS = ['Design Manager', 'Art Director', 'Creative Director', 'Deputy Head', 'HOD', 'HR', 'Other'];
const ASSESSMENTS = ['', 'Design Test', 'Portfolio Review', 'Writing / Communication Assessment', 'Marketing Case Study', 'Content Assessment', 'Product Assessment', 'Technical Test', 'Research Case Study', 'Data Analysis', 'Other'];
const PIPELINE = [
  ['cv_review', 'CV Review'], ['shortlisted', 'Shortlisted'], ['sent_to_hr', 'Sent to HR'], ['interview_scheduled', 'Interview Scheduled'],
  ['interview_completed', 'Interview Completed'], ['assessment_assigned', 'Assessment Assigned'], ['assessment_submitted', 'Assessment Submitted'],
  ['hod_interview', 'HOD Interview'], ['assessment_review', 'Assessment Review'], ['hod_recommendation', 'HOD Recommendation'],
  ['pending_final_approval', 'Pending Final Approval'], ['approved', 'Approved'], ['on_hold', 'On Hold'], ['not_approved', 'Not Approved'], ['offer', 'Offer'], ['closed', 'Closed']
];
const EMPTY = { candidateName: '', businessUnit: 'Creative', position: '', department: '', hrOwner: '', cvUrl: '', portfolioUrl: '', assessmentType: 'Design Test', interviewAt: '', firstInterviewPanel: [], interviewNotes: '' };
const labelFor = (value) => PIPELINE.find(([id]) => id === value)?.[1] || value;

export function RecruitmentSection({ user, onNotify }) {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY, department: user?.department || '' });
  const load = useCallback(async () => { try { setRecords(await fetchRecruitmentCases()); } catch (error) { onNotify?.(error.message, 'error'); } finally { setLoading(false); } }, [onNotify]);
  useEffect(() => { load(); }, [load]);
  const stats = useMemo(() => ({ total: records.length, interviews: records.filter((r) => ['interview_scheduled', 'interview_completed', 'hod_interview'].includes(r.currentStage)).length, approvals: records.filter((r) => r.currentStage === 'pending_final_approval').length, hired: records.filter((r) => ['approved', 'offer'].includes(r.currentStage)).length }), [records]);
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const togglePanel = (role) => setForm((current) => ({ ...current, firstInterviewPanel: current.firstInterviewPanel.includes(role) ? current.firstInterviewPanel.filter((item) => item !== role) : [...current.firstInterviewPanel, role] }));
  const submit = async (event) => { event.preventDefault(); try { await createRecruitmentCase(form); setForm({ ...EMPTY, department: user?.department || '' }); await load(); onNotify?.('Candidate added to Recruitment Center.', 'success'); } catch (error) { onNotify?.(error.message, 'error'); } };
  const openRecord = async (id) => { try { setSelected(await fetchRecruitmentCase(id)); } catch (error) { onNotify?.(error.message, 'error'); } };
  const saveSelected = async (changes) => { try { const updated = await updateRecruitmentCase(selected._id, changes); setSelected(updated); await load(); onNotify?.('Recruitment workflow updated.', 'success'); } catch (error) { onNotify?.(error.message, 'error'); } };

  return <section className="section-card recruitment-center">
    <div className="section-header"><div><h2><BriefcaseBusiness size={21}/> Recruitment Center</h2><p>Multi-Business Unit candidate pipeline, interviews, assessments, recommendations and controlled approvals.</p></div></div>
    <div className="sub-summary-bar"><span><Users size={15}/><b>{stats.total}</b> Candidates</span><span><CalendarDays size={15}/><b>{stats.interviews}</b> Interviews</span><span><BriefcaseBusiness size={15}/><b>{stats.approvals}</b> Pending Approval</span><span><CheckCircle2 size={15}/><b>{stats.hired}</b> Approved / Offer</span></div>
    <form onSubmit={submit} className="modal-form-section">
      <h3>Add Candidate</h3><div className="form-grid">
        <label className="form-group">Candidate Name *<input required maxLength={160} value={form.candidateName} onChange={(e) => setField('candidateName', e.target.value)}/></label>
        <label className="form-group">Business Unit *<select value={form.businessUnit} onChange={(e) => setField('businessUnit', e.target.value)}>{BUSINESS_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <label className="form-group">Position *<input required maxLength={160} value={form.position} onChange={(e) => setField('position', e.target.value)}/></label>
        <label className="form-group">Department *<input required maxLength={120} value={form.department} onChange={(e) => setField('department', e.target.value)}/></label>
        <label className="form-group">Business Unit HR Owner<input value={form.hrOwner} onChange={(e) => setField('hrOwner', e.target.value)} placeholder="Assigned HR name / team"/></label>
        <label className="form-group">Position-Based Assessment<select value={form.assessmentType} onChange={(e) => setField('assessmentType', e.target.value)}>{ASSESSMENTS.map((item) => <option key={item} value={item}>{item || 'No assessment'}</option>)}</select></label>
        <label className="form-group">CV Link<input type="url" value={form.cvUrl} onChange={(e) => setField('cvUrl', e.target.value)} placeholder="https://..."/></label>
        <label className="form-group">Portfolio Link<input type="url" value={form.portfolioUrl} onChange={(e) => setField('portfolioUrl', e.target.value)} placeholder="https://..."/></label>
        <label className="form-group">First Online Interview<input type="datetime-local" value={form.interviewAt} onChange={(e) => setField('interviewAt', e.target.value)}/></label>
        <label className="form-group">Interview Notes<textarea maxLength={1000} value={form.interviewNotes} onChange={(e) => setField('interviewNotes', e.target.value)}/></label>
      </div>
      <strong>First Interview Panel</strong><div className="recruitment-panel-options">{INTERVIEWERS.map((role) => <label key={role} className="status-badge"><input type="checkbox" checked={form.firstInterviewPanel.includes(role)} onChange={() => togglePanel(role)}/> {role}</label>)}</div>
      <div className="modal-footer"><button className="btn btn-primary"><Plus size={15}/> Add Candidate</button></div>
    </form>
    {loading ? <div className="empty-state"><Loader2 className="animate-spin"/> Loading…</div> : <div className="table-container"><table><thead><tr><th>Candidate</th><th>Business Unit</th><th>Position</th><th>HR Owner</th><th>Current Stage</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td><b>{record.candidateName}</b><small>{record.department}</small></td><td>{record.businessUnit || 'Creative'}</td><td>{record.position}</td><td>{record.hrOwner || '—'}</td><td><span className="status-badge">{labelFor(record.currentStage)}</span></td><td><button type="button" className="btn btn-outline btn-sm" onClick={() => openRecord(record._id)}><Eye size={14}/> Open</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><h3>{selected.candidateName}</h3><p>{selected.businessUnit} · {selected.position} · {selected.department}</p></div><button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button></div><div className="modal-form-section"><div className="form-grid"><label className="form-group">Pipeline Stage<select value={selected.currentStage} onChange={(e) => setSelected({ ...selected, currentStage: e.target.value })}>{PIPELINE.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-group">Evaluation Score (0–100)<input type="number" min="0" max="100" value={selected.evaluationScore ?? ''} onChange={(e) => setSelected({ ...selected, evaluationScore: e.target.value })}/></label><label className="form-group">HOD Recommendation<select value={selected.hodRecommendation || ''} onChange={(e) => setSelected({ ...selected, hodRecommendation: e.target.value })}><option value="">Pending</option><option>Proceed</option><option>Hold</option><option>Not Recommended</option></select></label><label className="form-group">HR / Management Final Approval<select value={selected.finalDecision || 'Pending'} onChange={(e) => setSelected({ ...selected, finalDecision: e.target.value })}><option>Pending</option><option>Approved</option><option>On Hold</option><option>Not Approved</option></select></label></div><p><b>First Interview Panel:</b> {selected.firstInterviewPanel?.join(', ') || 'Not assigned'}</p><p><b>Assessment:</b> {selected.assessmentType || 'Not assigned'}</p>{selected.cvUrl && <a href={selected.cvUrl} target="_blank" rel="noreferrer">Open CV</a>} {selected.portfolioUrl && <a href={selected.portfolioUrl} target="_blank" rel="noreferrer">Open Portfolio</a>}<div className="modal-footer"><button className="btn btn-primary" onClick={() => saveSelected({ currentStage: selected.currentStage, evaluationScore: selected.evaluationScore === '' ? undefined : Number(selected.evaluationScore), hodRecommendation: selected.hodRecommendation, finalDecision: selected.finalDecision })}>Save Workflow</button></div></div></div></div>}
  </section>;
}
