import {getAuthToken} from './authService';
import {handleApiResponse} from './api';
async function request(path,options={}){const r=await fetch('/api/production-orders/'+path,{...options,headers:{Authorization:`Bearer ${getAuthToken()}`,'Content-Type':'application/json'}}).then(handleApiResponse);const d=await r.json();if(!r.ok)throw new Error(d.error||'Production team request failed.');return d;}
export const fetchProductionTeam=()=>request('team').then(d=>d.members);
export const saveProductionTeam=members=>request('team',{method:'PUT',body:JSON.stringify({members})});
export const fetchDesignQueue=()=>request('design-queue').then(d=>d.items);
