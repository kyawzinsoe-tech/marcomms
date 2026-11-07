import React from 'react';
import './ProductionWorkflow.css';
export const PRODUCTION_STEPS = [
 ['artwork','Artwork & Print File','Designer','Print-ready artwork link','Quotations'],
 ['quotations','Quotations & Vendor Selection','Procurement','Supplier quotations and selected vendor','Sample Print & Approval'],
 ['sample_approval','Sample Print & Approval','Production / Designated Approver','Sample print → review → approve or revise','Cost & Head Approval'],
 ['invoice_head_approval','Cost & Head Approval','Admin / Designated Head','Cost and budget authorization','Final / Bulk Print'],
 ['bulk_production','Final / Bulk Print','Production owner','Approved production artwork','Quality Check'],
 ['quality_check','Quality Check','Production owner','Quality inspection evidence','Delivery & Receipt'],
 ['delivery_confirmation','Delivery & Receipt','Procurement','Delivery order and recipient confirmation','Final Invoice & Payment'],
 ['final_payment','Final Invoice & Payment','Finance / Admin','Final invoice and payment evidence','Close Order'],
 ['closed','Close Order','Admin / Designated Head','Order closed','Complete']
];
export const canonicalProductionStep=step=>({vendor_procedure:'invoice_head_approval',invoice_delivery_order:'final_payment'})[step]||step||'artwork';
export function ProductionProcessLine({currentStep='artwork',history=[]}){const current=canonicalProductionStep(currentStep);return <ol className="production-workflow-steps" aria-label="Production process">{PRODUCTION_STEPS.map(([key,label],index)=>{const recorded=history.some(h=>h.step===key&&['COMPLETED','APPROVED','SKIPPED'].includes(h.action));return <li key={key} className={current===key?'current':recorded?'complete':''} aria-current={current===key?'step':undefined}><span className="workflow-node">{index+1}</span><span>{label}</span></li>})}</ol>}
