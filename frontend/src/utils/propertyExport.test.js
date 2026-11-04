import {describe, it, expect} from 'vitest';
import writeExcelFile from 'write-excel-file/universal';
import {unzipSync, strFromU8} from 'fflate';
import {propertyExportTable, propertyExcelData, propertyPrintHtml} from './propertyExport';
const item={propertyNo:'12',date:'2026-11-04T00:00:00Z',category:'Computer',itemType:'Laptop',productName:'မြန်မာ <Laptop>',businessUnit:'Creative',quantity:2,condition:'Good',owner:'=Owner',note:'Private note',details:{specification:'M4 / 16 GB',deviceNo:'SN-123'}};
describe('Properties export',()=>{
 it('includes only selected optional columns, with fixed record numbers and numeric quantities',()=>{
  const table=propertyExportTable([item],['deviceNo'],{deviceNo:'Device / Serial No.'});
  expect(table.headers).not.toContain('Note');
  expect(table.rows[0]).not.toContain('Private note');
  expect(table.rows[0][0]).toBe('12');expect(table.rows[0][5]).toBe(2);
  expect(table.rows[0].at(-1)).toBe('SN-123');
  expect(propertyExportTable([item],['note'],{note:'Note'}).rows[0].at(-1)).toBe('Private note');
 });
 it('creates a real xlsx workbook, preserves Unicode, and exports formula-like input as text',async()=>{
  const table=propertyExportTable([item]);
  const blob=await writeExcelFile(propertyExcelData(table)).toBlob();
  const entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const xml=Object.values(entries).map(bytes => strFromU8(bytes)).join('\n');
  expect(Object.keys(entries)).toContain('xl/worksheets/sheet1.xml');
  expect(xml).toContain('မြန်မာ');expect(xml).toContain('=Owner');expect(xml).not.toContain('<f>');
 });
 it('escapes user content and prints only property data with repeating headers',()=>{
  const html=propertyPrintHtml(propertyExportTable([item]),'<script>alert(1)</script>');
  expect(html).toContain('&lt;Laptop&gt;');expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');expect(html).not.toContain('Private note');
  expect(html).toContain('table-header-group');expect(html).toContain('1 records');
 });
});
