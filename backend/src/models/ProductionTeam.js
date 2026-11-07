const mongoose=require('mongoose');
const schema=new mongoose.Schema({_id:{type:String,default:'production'},members:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
module.exports=mongoose.model('ProductionTeam',schema);
