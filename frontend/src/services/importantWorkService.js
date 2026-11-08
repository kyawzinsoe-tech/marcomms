import { getAuthToken } from './authService';
import { handleApiResponse } from './api';

async function request(path = '', options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch(`/api/important-work${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  }).then(handleApiResponse);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to process important work reminder.');
  return data;
}

export const fetchImportantWork = () => request('/').then((data) => data.items || []);
export const createImportantWork = (item) => request('/', { method: 'POST', body: JSON.stringify(item) }).then((data) => data.item);
export const updateImportantWork = (id, item) => request(Object.keys(item).length===1&&'designDriveUrl' in item?`/${id}/submit-review`:`/${id}`, { method: Object.keys(item).length===1&&'designDriveUrl' in item?'POST':'PUT', body: JSON.stringify(item) }).then((data) => data.item);
export const deleteImportantWork = (id) => request(`/${id}`, { method: 'DELETE' });

export const approveImportantWork=id=>request(`/${id}/approve`,{method:'POST'}).then(d=>d.item);
export const fetchDesignTeams=()=>request('/teams').then(d=>d.groups);
export const saveDesignTeams=groups=>request('/teams',{method:'PUT',body:JSON.stringify({groups})}).then(d=>d.groups);
export const fetchBusinessContacts=()=>request('/contacts').then(d=>d.contacts);
export const addBusinessContact=item=>request('/contacts',{method:'POST',body:JSON.stringify(item)}).then(d=>d.contacts);
export const deleteBusinessContact=id=>request(`/contacts/${id}`,{method:'DELETE'}).then(d=>d.contacts);
export const markDesignSent=id=>request(`/${id}/sent`,{method:'POST'}).then(d=>d.item);
export const fetchCreativeMembers=()=>request('/members').then(d=>d.members);
export const addCreativeMember=item=>request('/members',{method:'POST',body:JSON.stringify(item)}).then(d=>d.member);
export const editCreativeMember=(id,item)=>request(`/members/${id}`,{method:'PUT',body:JSON.stringify(item)}).then(d=>d.member);
export const deleteCreativeMember=id=>request(`/members/${id}`,{method:'DELETE'});

export const requestDesignRevision=(id,note)=>request(`/${id}/revision`,{method:'POST',body:JSON.stringify({note})});
export const submitDesignRevision=(id,designDriveUrl)=>request(`/${id}/revised-check`,{method:'POST',body:JSON.stringify({designDriveUrl})});
export const emailDesignBP=id=>request(`/${id}/email-bp`,{method:'POST'});

export const checkAssignedDesigner=id=>request(`/${id}/designer-check`,{method:'POST',body:JSON.stringify({})});

export const uploadWorkBrief=(id,file)=>request(`/${id}/brief`,{method:'PUT',body:file,headers:{'Content-Type':file.type,'X-File-Name':file.name}});
export async function downloadWorkBrief(id){const res=await fetch(`/api/important-work/${id}/brief`,{headers:{Authorization:`Bearer ${getAuthToken()}`}}).then(handleApiResponse);if(!res.ok)throw Error('Unable to open this private brief.');const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='Brief';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export const acceptProductionDesign=id=>request(`/${id}/accept-production`,{method:'POST'});
