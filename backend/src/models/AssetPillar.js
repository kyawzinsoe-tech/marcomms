const mongoose=require('mongoose');
const schema=new mongoose.Schema({key:{type:String,required:true,unique:true,immutable:true},label:{type:String,required:true,trim:true,maxlength:80},archived:{type:Boolean,default:false},mergedInto:{type:String,default:''},viewRoles:{type:[String],default:[]},writeRoles:{type:[String],default:[]}},{timestamps:true});
module.exports=mongoose.model('AssetPillar',schema);
