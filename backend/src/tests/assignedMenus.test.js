const test=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const {canOpenMenu,validateAssignedMenus,UNITS}=require('../utils/menuAccess');
const {hasPermission,PERMISSIONS}=require('../config/rbac');
const {protect}=require('../middleware/authMiddleware');
const User=require('../models/User');
const Session=require('../models/Session');
test('explicit selections limit Administrator permissions; Super Admin retains authority',()=>{
  const user={role:'admin',department:'Creative',assignedMenus:['properties']};
  assert.equal(hasPermission(user,PERMISSIONS.PROPERTY_UPDATE),true);
  assert.equal(hasPermission(user,PERMISSIONS.SUBSCRIPTION_DELETE),false);
  assert.equal(canOpenMenu({role:'super_admin',assignedMenus:[]},'properties'),true);
  assert.equal(canOpenMenu({role:'admin',assignedMenus:[]},'dashboard'),false);
  assert.throws(()=>validateAssignedMenus(['invalid']),/valid portal menus/);
  assert.equal(UNITS.includes('Research'),false);
});
test('direct API URL cannot bypass the assigned menu list',async()=>{
  const priorSecret=process.env.JWT_SECRET;
  const priorUser=User.findById,priorSession=Session.findOne;
  process.env.JWT_SECRET='test-only-menu-gate-secret';
  User.findById=()=>({select:async()=>({_id:'507f1f77bcf86cd799439011',role:'admin',assignedMenus:['reports']})});
  Session.findOne=()=>({select:async()=>({_id:'session',lastSeenAt:new Date()})});
  try{
    let continued=false;
    const res={statusCode:200,status(n){this.statusCode=n;return this;},json(data){this.body=data;}};
    const token=jwt.sign({id:'507f1f77bcf86cd799439011'},process.env.JWT_SECRET);
    await protect({headers:{authorization:`Bearer ${token}`},originalUrl:'/api/properties'},res,()=>{continued=true;});
    assert.equal(res.statusCode,403);assert.equal(continued,false);
  }finally{User.findById=priorUser;Session.findOne=priorSession;if(priorSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=priorSecret;}
});
test('Administrator cannot change menu selections through the user update API',async()=>{
  const res={statusCode:200,status(n){this.statusCode=n;return this;},json(value){this.body=value;}};
  await require('../controllers/userController').updateUser({user:{role:'admin'},params:{id:'507f1f77bcf86cd799439011'},body:{assignedMenus:['properties']}},res,error=>{throw error;});
  assert.equal(res.statusCode,403);
});
