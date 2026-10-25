import { getAuthToken } from './authService';

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` });
const parse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load recruitment data.');
  return data;
};

export const fetchRecruitmentCases = () => fetch('/api/recruitment', { headers: headers() }).then(parse).then((data) => data.records || []);
export const fetchRecruitmentCase = (id) => fetch(`/api/recruitment/${id}`, { headers: headers() }).then(parse).then((data) => data.record);
export const createRecruitmentCase = (payload) => fetch('/api/recruitment', { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(parse).then((data) => data.record);
export const updateRecruitmentCase = (id, payload) => fetch(`/api/recruitment/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(payload) }).then(parse).then((data) => data.record);
export const fetchRecruitmentBusinessUnits = () => fetch('/api/recruitment/business-units', { headers: headers() }).then(parse).then((data) => data.businessUnits || []);
export const createRecruitmentBusinessUnit = (payload) => fetch('/api/recruitment/business-units', { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(parse).then((data) => data.businessUnit);
export const updateRecruitmentBusinessUnit = (id, payload) => fetch(`/api/recruitment/business-units/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(payload) }).then(parse).then((data) => data.businessUnit);
