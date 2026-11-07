import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {ImportantWorkSection} from '../components/ImportantWorkSection';
import {DESIGN_TEAM_DEFAULTS} from '../services/designTeamDefaults';
describe('Design team assignment',()=>{
 it('groups creators by team, pairs print with three merchandising members and removes pairing for social',async()=>{
 const source={fetchImportantWork:async()=>[],fetchDesignTeams:async()=>DESIGN_TEAM_DEFAULTS};
 render(<ImportantWorkSection user={{role:'super_admin',email:'kyawzin.soe@kbzbank.com'}} dataSource={source}/>);
 await waitFor(()=>expect(screen.queryByText('Loading important work…')).toBeNull());
 const creator=screen.getByLabelText('Assigned Designer / Creator');
 expect(creator.querySelectorAll('optgroup').length).toBe(3);
 expect(creator.textContent).toContain('thu.aung@kbzbank.com');
 expect(screen.getByLabelText(/Assigned Merchandiser/).options.length).toBe(4);
 fireEvent.change(screen.getByLabelText('Design Type'),{target:{value:'Social'}});
 expect(screen.queryByLabelText(/Assigned Merchandiser/)).toBeNull();cleanup();
 });
 it('lets only assigned designer open the link editor',async()=>{
 const update=vi.fn().mockResolvedValue({});const source={fetchImportantWork:async()=>[{_id:'w',title:'My Design',designerEmail:'thu.aung@kbzbank.com',process:'Designing'}],updateImportantWork:update};
 render(<ImportantWorkSection user={{role:'bank_design',email:'thu.aung@kbzbank.com'}} dataSource={source}/>);
 fireEvent.click(await screen.findByText('Add / Edit Drive Link'));
 fireEvent.change(screen.getByLabelText('Google Drive Link'),{target:{value:'https://drive.google.com/file/d/test/view'}});
 fireEvent.click(screen.getByText('Save Link'));
 await waitFor(()=>expect(update).toHaveBeenCalledWith('w',{designDriveUrl:'https://drive.google.com/file/d/test/view'}));cleanup();
 render(<ImportantWorkSection user={{role:'bank_design',email:'other@kbzbank.com'}} dataSource={source}/>);
 await screen.findByText('My Design');expect(screen.queryByText('Add / Edit Drive Link')).toBeNull();cleanup();
 });
});
it('Bank/Pay/Comms selectors only offer contacts belonging to that unit',async()=>{
 const contacts=[{_id:'b',unit:'Bank',kind:'BP',name:'Bank BP',email:'bank.bp@example.com'},{_id:'p',unit:'Pay',kind:'BP',name:'Pay BP',email:'pay.bp@example.com'}];
 const source={fetchImportantWork:async()=>[],fetchBusinessContacts:async()=>contacts};
 render(<ImportantWorkSection user={{role:'super_admin',email:'kyawzin.soe@kbzbank.com'}} dataSource={source}/>);
 const form=within(screen.getByText('Add important work').closest('form'));
 await waitFor(()=>expect(form.getByLabelText(/^Bank BP/).textContent).toContain('bank.bp@example.com'));
 expect(form.getByLabelText(/^Bank BP/).textContent).not.toContain('pay.bp@example.com');
 fireEvent.change(form.getByLabelText('Business Unit'),{target:{value:'Pay'}});
 expect(form.getByLabelText(/^Pay BP/).textContent).toContain('pay.bp@example.com');cleanup();
});
it('approved video displays Sent action for its assigned creator',async()=>{
 const sent=vi.fn().mockResolvedValue({});const source={fetchImportantWork:async()=>[{_id:'v',title:'Video Project',designerEmail:'kyawchan.myae@kbzbank.com',designType:'Video & Photography',approvalStatus:'Approved',process:'Approved'}],markDesignSent:sent};
 const originalConfirm=window.confirm;window.confirm=vi.fn(()=>true);
 render(<ImportantWorkSection user={{role:'bank_design',email:'kyawchan.myae@kbzbank.com'}} dataSource={source}/>);
 fireEvent.click(await screen.findByText('Mark Sent'));await waitFor(()=>expect(sent).toHaveBeenCalledWith('v'));window.confirm=originalConfirm;cleanup();
});
