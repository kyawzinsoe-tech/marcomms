const test = require('node:test');
const assert = require('node:assert/strict');
const Token = require('../models/TokenEntry');
const controller = require('../controllers/tokenController');
const response = () => ({status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
test('business unit survives create, update and read responses, including manual Other names',async()=>{
 const originals={create:Token.create,findByIdAndUpdate:Token.findByIdAndUpdate,find:Token.find};
 let stored;
 try{
 Token.create=async data=>{stored=new Token(data);await stored.validate();return stored;};
 Token.findByIdAndUpdate=async(id,data)=>{Object.assign(stored,data);await stored.validate();return stored;};
 Token.find=()=>({sort:async()=>[stored]});
 let res=response();await controller.createTokenEntry({body:{date:'2026-11-05',account:'preview',project:'Campaign',tokens:50,businessUnit:'Bank'},user:{}},res,e=>{throw e;});assert.equal(res.data.tokenEntry.businessUnit,'Bank');
 res=response();await controller.updateTokenEntry({params:{id:String(stored._id)},body:{businessUnit:'Comms'}},res,e=>{throw e;});assert.equal(res.data.tokenEntry.businessUnit,'Comms');
 res=response();await controller.getTokenEntries({query:{}},res,e=>{throw e;});assert.equal(res.data.tokenEntries[0].businessUnit,'Comms');
 }finally{Object.assign(Token,originals);}
});
test('new entry must have a nonblank business unit',async()=>{const res=response();await controller.createTokenEntry({body:{businessUnit:'  '},user:{}},res,e=>{throw e;});assert.equal(res.code,400);});
