const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:120},email:{type:String,required:true,trim:true,lowercase:true,maxlength:254},team:{type:String,enum:['Designer','Video & Photography','Copy','Merchandising'],required:true},active:{type:Boolean,default:true},updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
schema.index({email:1,team:1},{unique:true});
module.exports=mongoose.model('CreativeMember',schema);
