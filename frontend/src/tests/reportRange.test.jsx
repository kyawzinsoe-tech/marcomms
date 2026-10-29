import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,test,expect,vi} from 'vitest';
import {PrintReport} from '../components/PrintReport';
import {TokenSection} from '../components/TokenSection';
vi.mock('../components/TrendChart',()=>({TrendChart:()=>null}));
afterEach(cleanup);
test('PDF renders only selected populated sections and omits printing/assets',()=>{
 render(<PrintReport type="month" reportMonth="2026-10" sections={['tokens']} subscriptions={[{id:'s',product:'Hidden subscription'}]} tokenEntries={[{id:'t',project:'Visible token project',tokens:10,date:'2026-10-01'}]} productionOrders={[{id:'p',campaignName:'Hidden order'}]} assets={[{id:'a',title:'Hidden asset'}]}/>);
 expect(screen.queryByText('Hidden subscription')).toBeNull();
 expect(screen.getByText('Visible token project')).toBeTruthy();
 expect(screen.queryByText(/Printing Suppliers/)).toBeNull();
 expect(screen.queryByText(/Brand Asset/)).toBeNull();
});
test('monthly range includes zero months and filters archived and other-year entries',()=>{
 render(<TokenSection reportMonth="2026-10" selectedYear={2026} allEntries={[{date:'2026-02-01',tokens:12,cost:2},{date:'2025-02-01',tokens:999},{date:'2026-02-02',tokens:888,archived:true}]}/>);
 expect(screen.getByText('February 2026')).toBeTruthy();
 expect(screen.getAllByText('12')).toHaveLength(2);
 fireEvent.change(screen.getByLabelText('From month'),{target:{value:'3'}});
 expect(screen.queryByText('February 2026')).toBeNull();
 expect(screen.getByText('December 2026')).toBeTruthy();
});
