const mongoose=require('mongoose');
const defaults={
 Designer:['thu.aung','kyawzin.soe','suhnin.phway','myatmon.soe','nayye.linn','waiyan.aung','phyozaw.thu'],
 'Video & Photography':['kyawchan.myae','aunghein.lwin'],
 Copy:['yethuya.soe','hsumyatnoe.aung'],
 Merchandising:['nainghtet.win','thaunghaymearn.lwin','pyaesone.tun']
};
for(const key of Object.keys(defaults))defaults[key]=defaults[key].map(v=>v+'@kbzbank.com');
const schema=new mongoose.Schema({_id:{type:String,default:'design-teams'},rosterInitializedAt:Date,contacts:{type:[{unit:{type:String,enum:['Bank','Pay','Comms']},kind:{type:String,enum:['Head','BP']},name:String,email:String,userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'}}],default:[]},groups:{type:mongoose.Schema.Types.Mixed,default:()=>defaults},updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true,optimisticConcurrency:true});
module.exports=mongoose.model('DesignTeams',schema);module.exports.defaults=defaults;
