const test=require('node:test');const assert=require('node:assert/strict');const Work=require('../models/ImportantWork');const ctl=require('../controllers/importantWorkController');
const id='507f1f77bcf86cd799439011';
async function invoke(fn,email,body={},role='super_admin'){let code=200,data;await fn({params:{id},body,user:{_id:id,email,name:'Authenticated Name',role}},{status(c){code=c;return this},json(d){data=d;return this}},e=>{throw e});return{code,data};}
test('designer check records server-authenticated identity and link, is idempotent, survives reload, and cannot be forged',async()=>{
 const original=Work.findById;let saved,saves=0;let item=new Work({_id:id,title:'Artwork',designerName:'Designer',designerEmail:'thu.aung@kbzbank.com',supervisorName:'KZS',dueDate:'2026-11-09',createdBy:id,process:'Review',designDriveUrl:'https://docs.google.com/presentation/d/abc/edit#slide=id.slide1'});item.save=async()=>{saved=item.toObject();saves++;};Work.findById=async()=>item;try{
 assert.equal((await invoke(ctl.designerCheck,'other@kbzbank.com')).code,403);
 assert.equal((await invoke(ctl.designerCheck,'kyawzin.soe@kbzbank.com')).code,403);
 assert.equal((await invoke(ctl.designerCheck,'thu.aung@kbzbank.com',{name:'Fake',email:'fake@example.com',at:'2000-01-01'},'bank_design')).code,200);
 assert.equal(saved.designChecks[0].email,'thu.aung@kbzbank.com');assert.equal(saved.designChecks[0].name,'Authenticated Name');assert.equal(saved.history[0].actorEmail,'thu.aung@kbzbank.com');assert.equal(saved.history[0].designDriveUrl,item.designDriveUrl);assert.ok(saved.designChecks[0].at instanceof Date);
 item=new Work(saved);item.save=async()=>saves++;assert.equal(item.designChecks[0].email,'thu.aung@kbzbank.com');await invoke(ctl.designerCheck,'thu.aung@kbzbank.com');assert.equal(saves,1);
 item.process='Revision';assert.equal((await invoke(ctl.designerCheck,'thu.aung@kbzbank.com')).code,409);
 }finally{Work.findById=original;}
});
test('KZS alone checks, Ma Su alone approves; link changes require a fresh check',async()=>{const original=Work.findById;const item={process:'Review',designType:'Social',designDriveUrl:'https://drive.google.com/file/d/current/view',history:[],save:async()=>{}};Work.findById=async()=>item;try{
 assert.equal((await invoke(ctl.checkDesign,'suhnin.phway@kbzbank.com')).code,403);
 assert.equal((await invoke(ctl.checkDesign,'kyawzin.soe@kbzbank.com',{},'viewer')).code,403);
 assert.equal((await invoke(ctl.checkDesign,'other@kbzbank.com')).code,403);
 await invoke(ctl.checkDesign,'kyawzin.soe@kbzbank.com');assert.equal(item.designChecks[0].url,item.designDriveUrl);await invoke(ctl.checkDesign,'kyawzin.soe@kbzbank.com');assert.equal(item.history.length,1);
 assert.equal((await invoke(ctl.approve,'kyawzin.soe@kbzbank.com')).code,403);item.designDriveUrl='https://drive.google.com/file/d/changed/view';assert.equal((await invoke(ctl.approve,'suhnin.phway@kbzbank.com')).code,400);
 await invoke(ctl.checkDesign,'kyawzin.soe@kbzbank.com');await invoke(ctl.approve,'suhnin.phway@kbzbank.com');assert.equal(item.approvalStatus,'Approved');assert.equal(item.designApprovals[0].email,'suhnin.phway@kbzbank.com');assert.equal(item.status,'Completed');
 }finally{Work.findById=original;}});
