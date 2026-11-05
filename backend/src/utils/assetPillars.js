const Pillar=require('../models/AssetPillar');
const builtins=[['kbz_bank','KBZ Bank'],['kbz_pay','KBZPay'],['kbz_comms','KBZBank Comms']];
async function ensurePillars(){await Promise.all(builtins.map(([key,label])=>Pillar.updateOne({key},{$setOnInsert:{key,label}},{upsert:true})));}
async function customAccess(user,key,write=false){const pillar=await Pillar.findOne({key});if(!pillar || pillar.mergedInto || (pillar.archived && user?.role!=='super_admin'))return false;return user?.role==='super_admin'||(!pillar.archived && (write?pillar.writeRoles:[...pillar.viewRoles,...pillar.writeRoles]).includes(user?.role));}
module.exports={ensurePillars,customAccess,builtins};
