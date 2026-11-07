// @vitest-environment jsdom
import React from 'react';
import {test,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {ProductionWorkflow} from '../components/production-orders/ProductionWorkflow';
test('quality stage identifies current action and does not ask for a Drive link',()=>{
 render(<ProductionWorkflow order={{orderNumber:'PO1',workflowStep:'quality_check'}} user={{role:'super_admin'}} onAdvance={vi.fn()}/>);
 expect(screen.queryByLabelText('Workflow Google Drive evidence link')).toBeNull();
 expect(screen.getByRole('button',{name:'Complete Quality Check'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Skip Quality Check'})).toBeTruthy();
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('5');cleanup();
});
test('quotation stage still requires its evidence',()=>{
 render(<ProductionWorkflow order={{orderNumber:'PO2',workflowStep:'quotations'}} user={{role:'super_admin'}} onAdvance={vi.fn()}/>);
 expect(screen.getByLabelText('Workflow Google Drive evidence link')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Complete Quotations & Vendor Selection'}).disabled).toBe(true);cleanup();
});
