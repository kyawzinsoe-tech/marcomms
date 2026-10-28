const Report = require('../models/MonthlyProjectReport');
const {parseWorkbook} = require('../controllers/monthlyProjectReportController');
const {logAuditEvent} = require('../utils/auditLogger');

// Older imports did not recognize the unspaced "KBZPay" tab. Append only
// that missing tab; preserve every existing sheet and protect concurrent imports.
module.exports = async function backfillMonthlyPaySheet() {
  const reports = await Report.find({sourceType:'google-sheet',payAliasRestored:{$ne:true},'sheets.key':{$ne:'kbz-pay'}}).select('_id sourceUrl month').lean();
  for (const report of reports) {
    const match=String(report.sourceUrl || '').match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
    if (!match) continue;
    try {
      const response=await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`,{signal:AbortSignal.timeout(20000)});
      if (!response.ok || (response.headers.get('content-type') || '').includes('text/html')) continue;
      const buffer=Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length>20*1024*1024) continue;
      const {sheets}=await parseWorkbook(buffer);
      const pay=sheets.find(sheet=>sheet.key==='kbz-pay');
      if (!pay) continue;
      const result=await Report.updateOne({_id:report._id,payAliasRestored:{$ne:true},'sheets.key':{$ne:'kbz-pay'}},{$push:{sheets:pay},$set:{payAliasRestored:true}});
      if(result.modifiedCount) logAuditEvent({actorId:'system',actorRole:'system',action:'MONTHLY_REPORT_MISSING_PAY_RESTORED',targetEntity:'monthly_project_report',targetId:report._id,metadata:{month:report.month,rows:pay.rows.length}});
    } catch(error) { console.warn('[Monthly report backfill]',report.month,error.name); }
  }
};
