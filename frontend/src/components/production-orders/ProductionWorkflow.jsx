import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, ShieldCheck, SkipForward } from 'lucide-react';
import './ProductionWorkflow.css';

const WORKFLOW_STEPS = [
  ['quotations', '3 Quotations', 'Procurement', 'Three supplier quotation files', 'Sample Approval'],
  ['sample_approval', 'Sample Approval', 'Admin / Designated Head', 'Approved sample or proof link', 'Vendor Procedure'],
  ['vendor_procedure', 'Vendor Procedure', 'Procurement', 'Vendor profile / due diligence', 'Invoice & Head Approval'],
  ['invoice_head_approval', 'Invoice & Head Approval', 'Admin / Designated Head', 'Invoice and budget authorization', 'Bulk Production'],
  ['bulk_production', 'Bulk Production', 'Production owner', 'Production progress or PO evidence', 'Confirm Delivery'],
  ['delivery_confirmation', 'Confirm Delivery', 'Procurement', 'PIC, address and delivery date', 'Invoice & Delivery Order'],
  ['invoice_delivery_order', 'Invoice & Delivery Order', 'Procurement', 'Invoice and delivery-order files', 'Final Payment'],
  ['final_payment', 'Final Payment', 'Finance / Admin', 'Payment evidence', 'Close Project'],
  ['closed', 'Close Project', 'Admin / Designated Head', 'Payment confirmed and project closed', 'Complete']
];

export function ProductionWorkflow({ order, user, advancing, onAdvance, onComplete, onViewOrder }) {
  const [completionReason, setCompletionReason] = useState('');
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const currentStep = order.workflowStep || 'quotations';
  const currentIndex = Math.max(0, WORKFLOW_STEPS.findIndex(([key]) => key === currentStep));
  const step = WORKFLOW_STEPS[currentIndex];
  const approvalStep = ['sample_approval', 'invoice_head_approval'].includes(currentStep);
  const isApprover = ['admin', 'super_admin'].includes(user?.role) || (user?.role === 'head_brand' && user?.productionApprover === true);
  const canOperate = ['procurement_officer', 'admin', 'super_admin', 'head_brand'].includes(user?.role);
  const canAdvance = approvalStep ? isApprover : canOperate;
  const isProductionOrderStep = currentStep === 'bulk_production';
  const skippedSteps = useMemo(() => new Set((order.workflowHistory || []).filter((item) => item.action === 'SKIPPED').map((item) => item.step)), [order.workflowHistory]);
  const evidenceByStep = order.workflowEvidence || {};
  const submit = (skip) => onAdvance(order, skip, { reason: note.trim(), evidenceUrl: evidenceUrl.trim() });

  if (currentStep === 'closed' || order.status === 'Completed') {
    return <div className="production-workflow production-workflow-complete" role="status"><Check size={18} /><div><strong>Complete</strong><span>Production workflow completed {order.completedAt ? new Date(order.completedAt).toLocaleString() : ''}</span></div></div>;
  }

  return (
    <div className="production-workflow" aria-label={`Workflow for ${order.orderNumber}`}>
      <ol className="production-workflow-steps">
        {WORKFLOW_STEPS.map(([key, label], index) => {
          const isSkipped = skippedSteps.has(key);
          const savedEvidence = evidenceByStep[key] || (order.workflowHistory || []).find((item) => item.step === key && item.evidenceUrl)?.evidenceUrl;
          return <li key={key} className={`${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''} ${isSkipped ? 'skipped' : ''}`}><span className="workflow-node">{index < currentIndex ? (isSkipped ? <SkipForward size={12} /> : <Check size={12} />) : index + 1}</span><span>{label}</span>{savedEvidence && <a className="workflow-evidence-link" href={savedEvidence} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} /> Drive evidence</a>}{key === 'bulk_production' && <button type="button" className="workflow-po-link" onClick={() => onViewOrder?.(order)} disabled={!onViewOrder}><ExternalLink size={11} /> {order.orderNumber}</button>}</li>;
        })}
      </ol>
      <div className="workflow-step-card"><div><small>Current owner</small><strong>{step[2]}</strong></div><div><small>Required evidence</small><strong>{step[3]}</strong></div><div><small>Next gate</small><strong>{step[4]}</strong></div></div>
      <div className="workflow-inputs"><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder={currentStep === 'quotations' ? 'Google Drive link for 3 quotations (required unless skipped)' : 'Google Drive / Docs evidence link (when applicable)'} aria-label="Workflow Google Drive evidence link" /><input type="text" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note / details (optional)" aria-label="Workflow note" /></div>
      <div className="production-workflow-actions"><span>{approvalStep ? <><ShieldCheck size={14} /> Admin or designated Head approval required</> : isProductionOrderStep ? 'Current Production Order · production in progress' : 'Database-backed operational step'}</span><div className="workflow-action-buttons">{isApprover && <button type="button" className="btn btn-warning btn-sm" disabled={advancing} onClick={() => submit(true)}><SkipForward size={13} /> Skip &amp; continue</button>}<button type="button" className="btn btn-primary btn-sm" disabled={!canAdvance || advancing || (currentStep === 'quotations' && !evidenceUrl.trim())} onClick={() => submit(false)}>{advancing ? <><Loader2 size={13} className="animate-spin" /> Saving &amp; auditing…</> : approvalStep ? 'Approve & continue' : isProductionOrderStep ? 'Complete production & continue' : 'Complete & continue'}</button></div></div>
      {Array.isArray(order.workflowHistory) && order.workflowHistory.length > 0 && <details className="workflow-history-panel"><summary>Workflow history ({order.workflowHistory.length})</summary>{order.workflowHistory.map((item, index) => <div className={`workflow-history-item ${item.action === 'SKIPPED' ? 'skipped' : ''}`} key={`${item.step}-${item.at || index}`}><span><strong>{item.action}</strong> · {item.step.replaceAll('_', ' ')}</span>{item.note && <small>{item.note}</small>}{item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Open evidence <ExternalLink size={11} /></a>}</div>)}</details>}
      {isApprover && <div className="production-workflow-override"><input type="text" maxLength={1000} value={completionReason} onChange={(event) => setCompletionReason(event.target.value)} placeholder="Early completion reason required" aria-label="Early completion reason" /><button type="button" className="btn btn-primary btn-sm" disabled={advancing || completionReason.trim().length < 5} onClick={() => onComplete(order, completionReason.trim())}><Check size={13} /> Complete entire workflow</button></div>}
    </div>
  );
}
