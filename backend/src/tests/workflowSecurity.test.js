const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { _workflowSecurity } = require('../controllers/productionOrderController');

describe('Production Workflow Approval Security', () => {
  it('allows only a designated Head account on approval steps', () => {
    assert.equal(_workflowSecurity.canApproveWorkflow({ role: 'head_brand', productionApprover: true }, 'sample_approval'), true);
    assert.equal(_workflowSecurity.canApproveWorkflow({ role: 'head_brand', productionApprover: false }, 'sample_approval'), false);
    assert.equal(_workflowSecurity.canApproveWorkflow({ role: 'admin', productionApprover: true }, 'sample_approval'), false);
  });

  it('does not turn operational steps into approval actions', () => {
    assert.equal(_workflowSecurity.canApproveWorkflow({ role: 'head_brand', productionApprover: true }, 'bulk_production'), false);
  });

  it('keeps approval steps non-skippable by limiting skip semantics to quotations', () => {
    assert.equal(_workflowSecurity.APPROVAL_STEPS.has('quotations'), false);
    assert.equal(_workflowSecurity.APPROVAL_STEPS.has('sample_approval'), true);
    assert.equal(_workflowSecurity.APPROVAL_STEPS.has('invoice_head_approval'), true);
  });

  it('validates optional quotation evidence links when supplied', () => {
    assert.equal(_workflowSecurity.isGoogleDriveUrl('https://drive.google.com/file/d/quotation/view'), true);
    assert.equal(_workflowSecurity.isGoogleDriveUrl('https://docs.google.com/spreadsheets/d/quotation'), true);
    assert.equal(_workflowSecurity.isGoogleDriveUrl('javascript:alert(1)'), false);
    assert.equal(_workflowSecurity.isGoogleDriveUrl('https://example.com/quotation'), false);
  });

  it('allows controlled early completion only for Admin and Head accounts', () => {
    assert.equal(_workflowSecurity.canForceComplete({ role: 'admin' }), true);
    assert.equal(_workflowSecurity.canForceComplete({ role: 'super_admin' }), true);
    assert.equal(_workflowSecurity.canForceComplete({ role: 'head_brand' }), true);
    assert.equal(_workflowSecurity.canForceComplete({ role: 'procurement_officer' }), false);
    assert.equal(_workflowSecurity.canForceComplete({ role: 'viewer' }), false);
  });
});
