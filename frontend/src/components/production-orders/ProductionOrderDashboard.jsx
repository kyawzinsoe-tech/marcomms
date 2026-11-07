import React from 'react';
import './ProductionWorkflow.css';
export function ProductionOrderDashboard({orders=[],metrics={}}){
 const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const cards=[['Total Orders',metrics.total??orders.length,'#6366f1'],['In Production',metrics.inProduction??orders.filter(o=>o.status==='In Production').length,'#0284c7'],['Sample Review',metrics.sampleProofing??orders.filter(o=>o.workflowStep==='sample_approval').length,'#d97706'],['Completed',metrics.completed??orders.filter(o=>o.status==='Completed').length,'#059669'],['Overdue',orders.filter(o=>o.deliveryDeadline&&!['Completed','Cancelled'].includes(o.status)&&o.deliveryDeadline.slice(0,10)<today).length,'#dc2626'],['Awaiting Head Approval',orders.filter(o=>['sample_approval','invoice_head_approval'].includes(o.workflowStep)).length,'#7c3aed']];
 return <div className="production-dashboard" aria-label="Production Orders Dashboard">{cards.map(([label,value,color])=><div className="production-dashboard-card" key={label} style={{borderTopColor:color}}><span>{label}</span><strong style={{color}}>{value}</strong></div>)}</div>;
}
