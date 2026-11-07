const test=require('node:test');
const assert=require('node:assert/strict');
const Order=require('../models/ProductionOrder');
const base={orderNumber:'TEST-PRINT',campaignName:'Test print',supplier:'507f1f77bcf86cd799439011',itemDescription:'Polo Shirt',quantity:5};
test('print stage and full print-ready URL survive serialization',async()=>{for(const printStage of ['Sample Print','Final Print']){const doc=new Order({...base,printStage,printFileUrl:'https://drive.google.com/file/d/test/view?usp=sharing'});await doc.validate();assert.equal(doc.toObject().printStage,printStage);assert.match(doc.toObject().printFileUrl,/usp=sharing/);}});
test('old orders work without print fields, unsafe links and invalid stages rejected',async()=>{await new Order(base).validate();await assert.rejects(new Order({...base,printStage:'Approved'}).validate());for(const printFileUrl of ['javascript:alert(1)','http://example.com/file','https://user:secret@example.com'])await assert.rejects(new Order({...base,printFileUrl}).validate());});
