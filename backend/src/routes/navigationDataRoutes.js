const router=require('express').Router();
const {protect}=require('../middleware/authMiddleware');
const {canOpenMenu}=require('../utils/menuAccess');
const Subscription=require('../models/Subscription');
router.get('/',protect,async(req,res,next)=>{
  try {
    const menu=req.query.for;
    if(!['alerts','tokens'].includes(menu) || !canOpenMenu(req.user,menu)) return res.status(403).json({error:'Menu access is required.'});
    const fields=menu==='alerts' ? 'product tool status expiry alertDays email reminderEmail archived' : 'product tool initialTokens archived';
    const subscriptions=(await Subscription.find({archived:false}).select(fields).lean()).map(item=>({...item,id:String(item._id)}));
    res.json({subscriptions});
  }catch(error){next(error);}
});
module.exports=router;
