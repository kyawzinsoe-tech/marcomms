const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  timestamp:{type:Date,required:true,index:true},
  category:String,
  actor:{id:String,role:String},
  action:{type:String,index:true},
  target:{entity:String,id:String},
  clientIp:String,
  outcome:String,
  metadata:mongoose.Schema.Types.Mixed
},{versionKey:false});
module.exports = mongoose.model('AuditEvent',schema);
