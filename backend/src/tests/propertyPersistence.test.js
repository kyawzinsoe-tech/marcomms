const test=require('node:test');
const assert=require('node:assert/strict');
const Property=require('../models/PropertyItem');
const controller=require('../controllers/propertyController');
const id='507f1f77bcf86cd799439011';
const body={propertyNo:'P-01',date:'2026-10-28',businessUnit:'Merchandising',category:'Power',itemType:'UPS',productName:'Power Tree',quantity:1,condition:'Good',owner:'Store',details:{deviceNo:'UPS-01'}};
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}});
test('Head update reaches model save and retains equipment details',async()=>{
  let saved=false;const old=Property.findById;
  const item={_id:id,businessUnit:'Merchandising',save:async()=>{saved=true;},toObject(){return {...body};}};
  Property.findById=async()=>item;
  try{const res=response();await controller.update({user:{_id:id,role:'bank_design',jobLevel:'head'},params:{id},body},res,error=>{throw error;});assert.equal(saved,true);assert.equal(res.body.item.details.deviceNo,'UPS-01');}finally{Property.findById=old;}
});
test('additional view grant cannot update a record',async()=>{
  const res=response();await controller.update({user:{role:'viewer',menuAccess:[{menu:'properties',units:['Merchandising']}]},params:{id},body},res,error=>{throw error;});assert.equal(res.statusCode,403);
});
test('cross-team Head delete does not call database deletion',async()=>{
  let deleted=false;const old=Property.findById;
  Property.findById=async()=>({_id:id,businessUnit:'Creative',deleteOne:async()=>{deleted=true;}});
  try{const res=response();await controller.remove({user:{role:'bank_design',jobLevel:'head'},params:{id}},res,error=>{throw error;});assert.equal(res.statusCode,403);assert.equal(deleted,false);}finally{Property.findById=old;}
});
