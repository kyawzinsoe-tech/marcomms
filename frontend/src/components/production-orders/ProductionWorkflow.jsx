import React, { useEffect, useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import './ProductionWorkflow.css';

import { PRODUCTION_STEPS as WORKFLOW_STEPS, ProductionProcessLine, canonicalProductionStep, ProductionProgressBar } from './ProductionProcessLine';

export function ProductionWorkflow({ order, user, advancing, onAdvance, showProgress = true }) {
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const currentStep = canonicalProductionStep(order.workflowStep);
  const currentIndex = Math.max(0, WORKFLOW_STEPS.findIndex(([key]) => key === currentStep));
  const step = WORKFLOW_STEPS[currentIndex];
  const evidenceRequired = ['quotations', 'sample_approval'].includes(currentStep);
  const showEvidence = ['artwork','quotations','sample_approval','delivery_confirmation','final_payment'].includes(currentStep);
  const approvalStep = ['sample_approval', 'invoice_head_approval'].includes(currentStep);
  const isApprover = ['admin', 'super_admin'].includes(user?.role) || (user?.role === 'head_brand' && user?.productionApprover === true);
  const ownsProject = !order.productionOwner || String(order.productionOwner)===String(user?.id||user?._id) || isApprover;
  const canOperate = ownsProject && ['procurement_officer', 'admin', 'super_admin', 'head_brand'].includes(user?.role);
  const canAdvance = approvalStep ? isApprover : canOperate;
  const submit = (skip, sampleAction='') => onAdvance(order, skip, { reason: note.trim(), evidenceUrl: evidenceUrl.trim(), sampleAction });

  useEffect(() => {
    setNote('');
    setEvidenceUrl('');
  }, [currentStep]);

  if (currentStep === 'closed' || order.status === 'Completed') {
    return <div className="production-workflow production-workflow-complete" role="status"><Check size={18} /><div><strong>Complete</strong><span>Production workflow completed {order.completedAt ? new Date(order.completedAt).toLocaleString() : ''}</span></div></div>;
  }

  return (
    <div className="production-workflow" aria-label={`Workflow for ${order.orderNumber}`}>
      {showProgress && <ProductionProgressBar currentStep={currentStep}/>}
      <ProductionProcessLine currentStep={currentStep} history={order.workflowHistory || []}/>
      <div className="workflow-step-card"><div><small>Current owner</small><strong>{step[2]}</strong></div><div><small>What to check</small><strong>{step[3]}</strong></div><div><small>Next gate</small><strong>{step[4]}</strong></div></div>
      <div className="workflow-inputs">{showEvidence&&<label className="workflow-field"><><span>{evidenceRequired?"Document / Sample Link (required)":"Document Link (optional)"}</span><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder={currentStep === 'quotations' ? 'Google Drive link for 3 quotations (required unless skipped)' : 'Google Drive / Docs evidence link (when applicable)'} aria-label="Workflow Google Drive evidence link" /></></label>}<input type="text" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note / details (optional)" aria-label="Workflow note" /></div>
      {currentStep==='sample_approval'?<div className="sample-review-panel"><h4>Sample Print → Review → Approved / Revise</h4><p>Sample status: <strong>{order.sampleStatus || 'Awaiting Print'}</strong></p><div className="workflow-action-buttons">{canOperate&&<button className="btn btn-primary" disabled={advancing||!evidenceUrl.trim()} onClick={()=>submit(false,'print')}>Submit Sample for Review</button>}{isApprover&&<><button className="btn btn-primary" disabled={advancing||order.sampleStatus!=='In Review'} onClick={()=>submit(false,'approve')}>Approve Sample & Continue</button><button className="btn btn-outline" disabled={advancing||order.sampleStatus!=='In Review'||!note.trim()} onClick={()=>submit(false,'revise')}>Revise Sample</button></>}</div><small>နမူနာ Link ထည့်ပြီး Review တင်ပါ။ ပြန်ပြင်ရန် Note ဖြည့်ပါ။ Approved ဖြစ်ပြီးမှ Final Print ဆက်နိုင်ပါမည်။</small></div>:<div className="production-workflow-actions"><span>{approvalStep?'Designated approval required':`Complete or skip “${step[1]}” → ${step[4]}`}</span><div className="workflow-action-buttons">{isApprover&&!['invoice_head_approval'].includes(currentStep)&&<button className="btn btn-warning btn-sm" disabled={advancing} onClick={()=>submit(true)}>Skip {step[1]}</button>}<button className="btn btn-primary btn-sm" disabled={!canAdvance||advancing||(currentStep==='quotations'&&!evidenceUrl.trim())} onClick={()=>submit(false)}>{advancing?'Saving…':approvalStep?`Approve ${step[1]}`:`Complete ${step[1]}`}</button></div></div>}
      {Array.isArray(order.workflowHistory) && order.workflowHistory.length > 0 && <details className="workflow-history-panel"><summary>Workflow history ({order.workflowHistory.length})</summary>{order.workflowHistory.map((item, index) => <div className={`workflow-history-item ${item.action === 'SKIPPED' ? 'skipped' : ''}`} key={`${item.step}-${item.at || index}`}><span><strong>{item.action}</strong> · {item.step.replaceAll('_', ' ')}</span>{item.note && <small>{item.note}</small>}{item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Open evidence <ExternalLink size={11} /></a>}</div>)}</details>}
    </div>
  );
}
