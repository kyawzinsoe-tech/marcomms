import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {CreativeMembers} from '../components/CreativeMembers';
describe('Creative member database actions',()=>{
 it('queries after each create/update/delete and requires deletion confirmation',async()=>{
 const row={_id:'m1',name:'Existing Member',email:'existing@example.com',team:'Designer',hasPortalAccount:true};
 const source={addCreativeMember:vi.fn().mockResolvedValue({}),editCreativeMember:vi.fn().mockResolvedValue({}),deleteCreativeMember:vi.fn().mockResolvedValue({})};const reload=vi.fn();
 render(<CreativeMembers members={[row]} dataSource={source} onReload={reload} onError={vi.fn()}/>);
 fireEvent.click(screen.getByText(/Creative Team Members/));
 fireEvent.change(screen.getByLabelText('Name *'),{target:{value:'New Member'}});fireEvent.change(screen.getByLabelText('Work Email *'),{target:{value:'new@example.com'}});fireEvent.click(screen.getByText('Add Member'));
 await waitFor(()=>expect(source.addCreativeMember).toHaveBeenCalledWith({name:'New Member',email:'new@example.com',team:'Designer'}));await waitFor(()=>expect(reload).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByText('Edit'));fireEvent.change(screen.getByLabelText('Name *'),{target:{value:'Updated Member'}});fireEvent.click(screen.getByText('Save Changes'));
 await waitFor(()=>expect(source.editCreativeMember).toHaveBeenCalledWith('m1',expect.objectContaining({name:'Updated Member'})));await waitFor(()=>expect(reload).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByText('Delete'));expect(source.deleteCreativeMember).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Confirm Delete'));await waitFor(()=>expect(source.deleteCreativeMember).toHaveBeenCalledWith('m1'));await waitFor(()=>expect(reload).toHaveBeenCalledTimes(3));cleanup();
 });
});
