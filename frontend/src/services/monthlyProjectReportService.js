import { getAuthToken } from './authService';
const headers = () => ({ Authorization: `Bearer ${getAuthToken()}` });
const parse = async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Monthly report request failed.'); return data; };
export const fetchMonthlyProjectReports = async () => parse(await fetch('/api/monthly-project-reports', { headers: headers() }));
export const importMonthlyProjectReport = async ({ file, month }) => parse(await fetch(`/api/monthly-project-reports/import?month=${encodeURIComponent(month)}&filename=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { ...headers(), 'Content-Type': file.type || 'application/octet-stream' }, body: file }));
export const importMonthlyGoogleSheet = async ({ url, month }) => parse(await fetch('/api/monthly-project-reports/import-google-sheet', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ url, month }) }));
export const deleteMonthlyProjectReport = async (month) => parse(await fetch(`/api/monthly-project-reports/${encodeURIComponent(month)}`, { method: 'DELETE', headers: headers() }));
