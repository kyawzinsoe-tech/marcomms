import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,test,expect,vi} from 'vitest';
import {UserModal} from '../components/UserModal';
afterEach(cleanup);
const editingUser={id:'one',name:'Preview Admin',email:'admin@example.com',role:'admin',department:'Creative',assignedMenus:['reports'],menuAccess:[]};
test('only Super Admin can see and save per-menu selections',async()=>{
  const onSave=vi.fn().mockResolvedValue({});
  render(<UserModal isOpen editingUser={editingUser} currentUserRole="super_admin" onSave={onSave}/>);
  const checkbox=screen.getByLabelText('Properties List',{selector:'input'});
  fireEvent.click(checkbox);
  fireEvent.submit(checkbox.closest('form'));
  await waitFor(()=>expect(onSave).toHaveBeenCalled());
  expect(onSave.mock.calls[0][0].assignedMenus).toEqual(['reports','properties']);
  expect(screen.queryByRole('option',{name:'Research'})).toBeNull();
});
test('Administrator cannot see the menu assignment controls',()=>{
  render(<UserModal isOpen editingUser={{...editingUser,role:'viewer'}} currentUserRole="admin" onSave={vi.fn()}/>);
  expect(screen.queryByText('Assigned Portal Menus')).toBeNull();
  expect(screen.queryByText('Additional Menu Access — View Only')).toBeNull();
});
