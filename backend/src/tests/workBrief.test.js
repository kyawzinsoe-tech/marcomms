const test=require('node:test');const assert=require('node:assert/strict');const Work=require('../models/ImportantWork');const ctl=require('../controllers/importantWorkController');
const id='507f1f77bcf86cd799439011',other='507f1f77bcf86cd799439012';
async function call(fn,user,type='application/pdf',body=Buffer.from('%PDF-test')){let code=200,data,headers={};await fn({params:{id},user,body,get:k=>k==='content-type'?type:'brief.pdf'},{status(c){code=c;return this},json(d){data=d;return this},set(k,v){headers[k]=v;return this},send(d){data=d}},e=>{throw e});return{code,data,headers};}
test('brief stays private to creator and designer, validates file and persists bytes',async()=>{const orig=Work.findById;const item={createdBy:id,designerEmail:'designer@kbzbank.com',history:[],save:async()=>{}};Work.findById=()=>({then:resolve=>resolve(item),select:async()=>item});try{
assert.equal((await call(ctl.uploadBrief,{_id:other,email:'head@kbzbank.com'})).code,403);
assert.equal((await call(ctl.uploadBrief,{_id:id},'application/pdf',Buffer.from('<html>'))).code,400);
assert.equal((await call(ctl.uploadBrief,{_id:id})).code,200);assert.equal(item.briefData.toString(),'%PDF-test');
assert.equal((await call(ctl.downloadBrief,{_id:other,email:'head@kbzbank.com'})).code,403);
for(const user of [{_id:id},{_id:other,email:'designer@kbzbank.com'}]){const result=await call(ctl.downloadBrief,user);assert.equal(result.code,200);assert.equal(result.headers['Cache-Control'],'private, no-store');assert.equal(result.data.toString(),'%PDF-test');}
}finally{Work.findById=orig;}});

test('only the assigned Merchandiser accepts a ready print project, once',async()=>{const orig=Work.findById;let saves=0;const item={designType:'Print',approvalStatus:'Approved',handoffTo:'Production',merchandisingEmail:'merch@kbzbank.com',history:[],save:async()=>saves++};Work.findById=async()=>item;try{assert.equal((await call(ctl.acceptProduction,{_id:id,email:'other@kbzbank.com'})).code,403);assert.equal((await call(ctl.acceptProduction,{_id:id,email:'merch@kbzbank.com'})).code,200);assert.ok(item.productionAcceptedAt);await call(ctl.acceptProduction,{_id:id,email:'merch@kbzbank.com'});assert.equal(saves,1);}finally{Work.findById=orig;}});
