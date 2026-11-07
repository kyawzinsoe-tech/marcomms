const Member=require('../models/CreativeMember');
const Teams=require('../models/DesignTeams');
const User=require('../models/User');
const names={'thu.aung':'Thu Aung','kyawzin.soe':'Kyaw Zin Soe','suhnin.phway':'Su Hnin Phway','myatmon.soe':'Myat Mon Soe','nayye.linn':'Nay Ye Linn','waiyan.aung':'Wai Yan Aung','phyozaw.thu':'Phyo Zaw Thu','kyawchan.myae':'Kyaw Chan Myae','aunghein.lwin':'Aung Hein Lwin','yethuya.soe':'Ye Thuya Soe','hsumyatnoe.aung':'Hsu Myat Noe Aung','nainghtet.win':'Naing Htet Win','thaunghaymearn.lwin':'Thaung Hay Mearn Lwin','pyaesone.tun':'Pyae Sone Tun'};
async function initialize(){
 const config=await Teams.findById('design-teams');if(config?.rosterInitializedAt)return;
 const groups=config?.groups||Teams.defaults;
 const users=await User.find({email:{$in:Object.values(groups).flat()}}).select('name email').lean();
 const operations=Object.entries(groups).flatMap(([team,emails])=>emails.map(email=>({updateOne:{filter:{email,team},update:{$setOnInsert:{email,team,name:users.find(u=>u.email===email)?.name||names[email.split('@')[0]]||email,active:true}},upsert:true}})));
 if(operations.length)await Member.bulkWrite(operations);
 await Teams.findByIdAndUpdate('design-teams',{$set:{rosterInitializedAt:new Date()}},{upsert:true});
}
async function groups(){const result=Object.fromEntries(Object.keys(Teams.defaults).map(k=>[k,[]]));const rows=await Member.find({active:true}).select('email team').lean();for(const row of rows)result[row.team]?.push(row.email);return result;}
module.exports={initialize,groups};
