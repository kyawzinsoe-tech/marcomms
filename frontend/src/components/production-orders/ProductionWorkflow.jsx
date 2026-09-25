import React from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
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

export function ProductionWorkflow({ order, user, advancing, onAdvance }) {
  const currentIndex = Math.max(0, WORKFLOW_STEPS.findIndex(([key]) => key === (order.workflowStep || 'quotations')));
  const approvalStep = ['sample_approval', 'invoice_head_approval'].includes(order.workflowStep);
  const canApprove = user?.role === 'head_brand' && user?.productionApprover === true;
  const canOperate = ['procurement_officer', 'admin', 'super_admin'].includes(user?.role);
  const canAdvance = approvalStep ? canApprove : canOperate;

  return (
    <div className="production-workflow" aria-label={`Workflow for ${order.orderNumber}`}>
      <ol className="production-workflow-steps">
        {WORKFLOW_STEPS.map(([key, label], index) => (
          <li key={key} className={`${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''}`}>
            <span className="workflow-node">{index < currentIndex ? <Check size={12} /> : index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="production-workflow-actions">
        <span>{approvalStep ? <><ShieldCheck size={14} /> Designated Head approval required</> : 'Operational step'}</span>
        {order.workflowStep !== 'closed' && (
          <button type="button" className="btn btn-primary btn-sm" disabled={!canAdvance || advancing} onClick={() => onAdvance(order)}>
            {advancing ? <><Loader2 size={13} className="animate-spin" /> Saving & auditing…</> : approvalStep ? 'Approve & continue' : 'Complete & continue'}
          </button>
        )}
      </div>
    </div>
  );
}
