import React, { useState } from 'react';
import { Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import './ProductionWorkflow.css';

const WORKFLOW_STEPS = [
  ['quotations', '3 Quotations'],
  ['sample_approval', 'Sample Approval'],
  ['vendor_procedure', 'Vendor Procedure'],
  ['invoice_head_approval', 'Invoice & Head Approval'],
  ['bulk_production', 'Bulk Production'],
  ['delivery_confirmation', 'Confirm Delivery'],
  ['invoice_delivery_order', 'Invoice & Delivery Order'],
  ['final_payment', 'Final Payment'],
  ['closed', 'Close Project']
];

export function ProductionWorkflow({ order, user, advancing, onAdvance, onComplete, onViewOrder }) {
  const [completionReason, setCompletionReason] = useState('');
  const currentIndex = Math.max(0, WORKFLOW_STEPS.findIndex(([key]) => key === (order.workflowStep || 'quotations')));
  const approvalStep = ['sample_approval', 'invoice_head_approval'].includes(order.workflowStep);
  const canApprove = user?.role === 'head_brand' && user?.productionApprover === true;
  const canOperate = ['procurement_officer', 'admin', 'super_admin'].includes(user?.role);
  const canAdvance = approvalStep ? canApprove : canOperate;
  const canComplete = ['head_brand', 'admin', 'super_admin'].includes(user?.role);
  const isProductionOrderStep = order.workflowStep === 'bulk_production';
  const actionLabel = isProductionOrderStep
    ? 'Complete production & continue'
    : approvalStep
      ? 'Approve & continue'
      : 'Complete & continue';

  if ((order.workflowStep || 'quotations') === 'closed' || order.status === 'Completed') {
    return (
      <div className="production-workflow production-workflow-complete" role="status">
        <Check size={18} />
        <div><strong>Complete</strong><span>Production workflow completed {order.completedAt ? new Date(order.completedAt).toLocaleString() : ''}</span></div>
      </div>
    );
  }

  return (
    <div className="production-workflow" aria-label={`Workflow for ${order.orderNumber}`}>
      <ol className="production-workflow-steps">
        {WORKFLOW_STEPS.map(([key, label], index) => (
          <li key={key} className={`${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''}`}>
            <span className="workflow-node">{index < currentIndex ? <Check size={12} /> : index + 1}</span>
            <span>{label}</span>
            {key === 'bulk_production' && (
              <button type="button" className="workflow-po-link" onClick={() => onViewOrder?.(order)} disabled={!onViewOrder}>
                <ExternalLink size={11} /> {order.orderNumber}
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="production-workflow-actions">
        <span>{approvalStep ? <><ShieldCheck size={14} /> Designated Head approval required</> : isProductionOrderStep ? 'PO issued · production in progress' : 'Operational step'}</span>
        {order.workflowStep !== 'closed' && (
          <>
          <button type="button" className="btn btn-primary btn-sm" disabled={!canAdvance || advancing} onClick={() => onAdvance(order, false)}>
            {advancing ? <><Loader2 size={13} className="animate-spin" /> Saving & auditing…</> : actionLabel}
          </button>
          </>
        )}
      </div>
      {order.workflowStep === 'quotations' && canAdvance && (
        <div className="quotation-skip-panel">
          <div>
            <strong>3 Quotations မလိုပါသလား?</strong>
            <p>Data မဖြည့်ဘဲ ကျော်နိုင်ပြီး လုပ်ဆောင်သူနှင့် အချိန်ကို audit history တွင် မှတ်တမ်းတင်ပါမည်။</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" disabled={advancing} onClick={() => onAdvance(order, true)}>
            Skip &amp; continue
          </button>
        </div>
      )}
      {Array.isArray(order.workflowHistory) && order.workflowHistory.length > 0 && (
        <details className="workflow-history-panel">
          <summary>Workflow history ({order.workflowHistory.length})</summary>
          {order.workflowHistory.map((item, index) => (
            <div className="workflow-history-item" key={`${item.step}-${item.at || index}`}>
              <span><strong>{item.action}</strong> · {item.step.replaceAll('_', ' ')}</span>
              {item.note && <small>{item.note}</small>}
              {item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer">Open evidence <ExternalLink size={11} /></a>}
            </div>
          ))}
        </details>
      )}
      {canComplete && (
        <div className="production-workflow-override">
          <input
            type="text"
            maxLength={1000}
            value={completionReason}
            onChange={(event) => setCompletionReason(event.target.value)}
            placeholder="Completion reason required (Admin/Head override)"
            aria-label="Early completion reason"
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={advancing || completionReason.trim().length < 5} onClick={() => onComplete(order, completionReason.trim())}>
            <Check size={13} /> Complete
          </button>
        </div>
      )}
    </div>
  );
}
