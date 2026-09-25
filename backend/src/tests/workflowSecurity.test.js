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
});
