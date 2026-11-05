const router = require('express').Router();
const Setting = require('../models/Setting');
const {protect} = require('../middleware/authMiddleware');
const {requireSuperAdmin} = require('../middleware/adminMiddleware');
const {logAuditEvent} = require('../utils/auditLogger');
const allowed = ['alerts','subscriptions','tokens','important-work','reports','kbz-bank','kbz-pay','kbz-comms','suppliers','production-orders','production-inventory','properties','recruitment'];
router.use(protect);
router.get('/',async(req,res,next)=>{try{const config=await Setting.findOne({key:'dashboard_config'});res.json({hiddenMenus:config?.hiddenMenus || []});}catch(e){next(e);}});
router.put('/',requireSuperAdmin,async(req,res,next)=>{try{
 const hiddenMenus=req.body.hiddenMenus;
 if(!Array.isArray(hiddenMenus)||hiddenMenus.some(menu=>!allowed.includes(menu)))return res.status(400).json({error:'Invalid menu list.'});
 const before=await Setting.findOne({key:'dashboard_config'});
 const config=await Setting.findOneAndUpdate({key:'dashboard_config'},{$set:{hiddenMenus:[...new Set(hiddenMenus)]}},{new:true,upsert:true,runValidators:true});
 logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'GLOBAL_MENU_VISIBILITY_UPDATED',targetEntity:'Setting',targetId:config._id,ip:req.ip,metadata:{before:before?.hiddenMenus||[],after:config.hiddenMenus}});
 res.json({hiddenMenus:config.hiddenMenus});
}catch(e){next(e);}});
module.exports=router;
