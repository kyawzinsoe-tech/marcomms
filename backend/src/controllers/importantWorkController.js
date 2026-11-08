const mongoose = require('mongoose');
const { logAuditEvent } = require('../utils/auditLogger');
const ProductionOrder = require('../models/ProductionOrder');
const DesignTeams=require('../models/DesignTeams');
const roster=require('../services/creativeRoster');
const User=require('../models/User');
const ImportantWork = require('../models/ImportantWork');
const { ROLES, normalizeRole } = require('../config/rbac');

const EDIT_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HEAD_BRAND]);
const LINK_HOSTS = /^(drive\.google\.com|docs\.google\.com|1drv\.ms|[a-z0-9.-]+\.sharepoint\.com)$/i;
const safeText = (value, max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const APPROVERS={'suhnin.phway@kbzbank.com':'Creative Head','kyawzin.soe@kbzbank.com':'Art Director'};
const canEdit = (user) => EDIT_ROLES.has(normalizeRole(user?.role));
const canReview=user=>canEdit(user)&&Boolean(APPROVERS[String(user?.email||'').toLowerCase()]);
const canAssign=user=>user?.canAssignDesignWork===true;

function sanitizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.slice(0, 10).map((link) => {
    const type = ['Excel', 'PDF', 'Google Slides'].includes(link?.type) ? link.type : null;
    let parsed;
    try { parsed = new URL(String(link?.url || '')); } catch { return null; }
    if (!type || parsed.protocol !== 'https:' || !LINK_HOSTS.test(parsed.hostname)) return null;
    if (type === 'Google Slides' && parsed.hostname !== 'docs.google.com') return null;
    return { type, label: safeText(link.label || type, 120), url: parsed.toString().slice(0, 1000) };
  }).filter(Boolean);
}

async function validateAssignment(data){const doc=await DesignTeams.findById('design-teams');const groups=await roster.groups();const designers=[...groups.Designer,...groups['Video & Photography'],...groups.Copy];if(!designers.includes(data.designerEmail))throw Object.assign(new Error('Select a member from the design teams.'),{statusCode:400});if(data.designType==='Print'&&data.printDestination!=='Supplier'&&!groups.Merchandising.includes(data.merchandisingEmail))throw Object.assign(new Error('Select a Merchandising member for Print Design.'),{statusCode:400});const contacts=doc?.contacts||[];for(const [field,kind] of [['bpEmail','BP']]){if(!contacts.some(c=>c.unit===data.businessUnit&&c.kind===kind&&c.email===data[field]))throw Object.assign(new Error(`Select the ${data.businessUnit} ${kind} account.`),{statusCode:400});}return data;}

function payload(body) {
  const dueDate = safeText(body.dueDate, 10);
  if (!safeText(body.title, 160)) throw Object.assign(new Error('Work title is required.'), { statusCode: 400 });
  if (!safeText(body.designerName, 120)) throw Object.assign(new Error('Designer name is required.'), { statusCode: 400 });
  if (!safeText(body.supervisorName, 120)) throw Object.assign(new Error('Supervising designer name is required.'), { statusCode: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw Object.assign(new Error('A valid due date is required.'), { statusCode: 400 });
  const designDriveUrl = safeText(body.designDriveUrl, 2000);
  if (designDriveUrl) {let url;try{url=new URL(designDriveUrl);}catch{}if(!url||url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname)||url.username||url.password)throw Object.assign(new Error('Use the full Google Drive / Docs design link.'),{statusCode:400});}
  return {
    businessUnit:['Bank','Pay','Comms'].includes(body.businessUnit)?body.businessUnit:'Bank',businessHeadEmail:safeText(body.businessHeadEmail,254).toLowerCase(),bpEmail:safeText(body.bpEmail,254).toLowerCase(),
    designerEmail:safeText(body.designerEmail,254).toLowerCase(), merchandisingEmail:body.designType!=='Print'?'':safeText(body.merchandisingEmail,254).toLowerCase(),
    printDestination:body.printDestination==='Supplier'?'Supplier':'Production', supplierName:safeText(body.supplierName,160),
    designType: ['Social','Video & Photography','Other'].includes(body.designType)?body.designType:'Print', designDriveUrl, designChecked:false,
    description: safeText(body.description, 2000),
    title: safeText(body.title, 160),
    designerName: safeText(body.designerName, 120),
    supervisorName: safeText(body.supervisorName, 120),
    process: 'Planned',
    dueDate
  };
}

exports._canAssignDesign=canAssign;
exports._importantWorkValidation = { sanitizeLinks, payload, validateAssignment };
exports.list = async (req, res, next) => {
  try { res.json({ items: await ImportantWork.find((canAssign(req.user)||canReview(req.user))?{}:{$or:[{createdBy:req.user._id},{designerEmail:req.user.email},{businessHeadEmail:req.user.email},{bpEmail:req.user.email},{merchandisingEmail:req.user.email}]}).sort({ dueDate: 1, priority: -1 }).lean() }); } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    if (!canAssign(req.user)) return res.status(403).json({ error: 'Only the designated Design Manager or Senior Designer assigns work.' });
    const item = await ImportantWork.create({ ...await validateAssignment(payload(req.body)), createdBy: req.user._id, updatedBy: req.user._id, history:[{action:'CREATED',actor:req.user._id,actorName:req.user.name}] });
    res.status(201).json({ item });
  } catch (error) { next(error); }
};
exports.update = async (req, res, next) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid work ID.' });
    const item = await ImportantWork.findById(req.params.id);
    if (!item) return res.status(404).json({error:'Important work item not found.'});
    if(!canAssign(req.user)||req.designSubmission){
      if(!item.designerEmail||item.designerEmail!==String(req.user.email||'').toLowerCase())return res.status(403).json({error:'Only the assigned designer can update this design link.'});
      if(item.approvalStatus==='Approved'||item.handoffTo)return res.status(409).json({error:'Approved design is locked.'});
      const next=payload({...item.toObject(),designDriveUrl:req.body.designDriveUrl});item.designDriveUrl=next.designDriveUrl;item.designChecked=false;item.designChecks=[];item.designApprovals=[];item.sentAt=undefined;item.sentBy=undefined;item.process='Review';item.revisionSubmittedAt=new Date();item.updatedBy=req.user._id;item.history.push({action:'DESIGN_LINK_UPDATED',actor:req.user._id,actorName:req.user.name});await item.save();return res.json({item});
    }
    if (item.handoffTo) return res.status(409).json({error:'This design has been handed off. Update the linked production order instead.'});
    const updated=await validateAssignment(payload(req.body));
    if(String(item.createdBy)!==String(req.user._id))updated.description=item.description;
    updated.process='Planned';
    Object.assign(item,updated,{updatedBy:req.user._id,approvalStatus:'Pending',designChecks:[],designApprovals:[],sentAt:undefined,sentBy:undefined,approvedBy:undefined,approvedAt:undefined});
    item.history.push({action:'UPDATED',actor:req.user._id,actorName:req.user.name,note:'Design changes require a new final approval.'});
    await item.save();
    res.json({ item });
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    if (!canAssign(req.user)) return res.status(403).json({ error: 'Creative Head or Art Director manages this work.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid work ID.' });
    if (await ProductionOrder.exists({sourceWork:req.params.id})) return res.status(409).json({error:'Linked production order exists. Keep this approved design for history.'});
    const item = await ImportantWork.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Important work item not found.' });
    res.status(204).end();
  } catch (error) { next(error); }
};

exports.approve = async(req,res,next)=>{try{
 if(!canReview(req.user))return res.status(403).json({error:'Only Creative Head or Art Director may approve designs.'});
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Design not found.'});
 if(item.handoffTo)return res.status(409).json({error:'Design already handed off.'});
 if(item.process!=='Review'||!item.designDriveUrl)return res.status(400).json({error:'Submit the final design Drive link for Review before approval.'});
 if(item.designType==='Print'&&item.printDestination!=='Supplier'&&!item.merchandisingEmail)return res.status(400).json({error:'Assign a Merchandising member before final approval.'});
 if(item.designType==='Print'&&item.printDestination==='Supplier'&&!item.supplierName)return res.status(400).json({error:'Enter the external supplier name.'});
 const email=String(req.user.email||'').toLowerCase();const slot=APPROVERS[email];
 if(!slot)return res.status(403).json({error:'Creative Head or Art Director approval is required.'});
 item.designApprovals=[{slot,actor:req.user._id,name:req.user.name,email,at:new Date()}];
 item.history.push({action:'DESIGN_APPROVAL',actor:req.user._id,actorName:req.user.name,actorEmail:email,designDriveUrl:item.designDriveUrl,note:slot});
 item.approvalStatus='Approved';item.process='Approved';item.approvedBy=req.user._id;item.approvedAt=new Date();if(item.designType==='Print'){item.handoffTo=item.printDestination==='Supplier'?'Supplier':'Production';item.recipientName=item.printDestination==='Supplier'?item.supplierName:item.merchandisingEmail;item.handedOffAt=new Date();item.status='Waiting';item.history.push({action:'READY_FOR_PRODUCTION',actor:req.user._id,actorName:req.user.name,note:item.merchandisingEmail});}if(item.designType==='Social'){item.status='Completed';}item.revisionSubmittedAt=undefined;item.history.push({action:'FINAL_APPROVED',actor:req.user._id,actorName:req.user.name});await item.save();res.json({item});
}catch(e){next(e)}};
exports.teams=async(req,res,next)=>{try{const doc=await DesignTeams.findById('design-teams');res.json({groups:await roster.groups()});}catch(e){next(e)}};
exports.saveTeams=async(req,res)=>res.status(405).json({error:'Use member Add / Edit / Delete actions.'});

exports.contacts=async(req,res,next)=>{try{const doc=await DesignTeams.findById('design-teams');res.json({contacts:doc?.contacts||[]});}catch(e){next(e)}};
exports.addContact=async(req,res,next)=>{try{
 if(req.user.role!=='super_admin')return res.status(403).json({error:'Super Admin manages Head / BP accounts.'});
 if(req.body.contactId&&!mongoose.Types.ObjectId.isValid(req.body.contactId))return res.status(400).json({error:'Invalid contact ID.'});
 const {unit,kind}=req.body;const name=safeText(req.body.name,120),email=safeText(req.body.email,254).toLowerCase();
 if(!['Bank','Pay','Comms'].includes(unit)||!['Head','BP'].includes(kind)||!name||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Enter Business Unit, Head/BP, name and valid email.'});
 const account=await User.findOne({email});if(!account)return res.status(400).json({error:'Create this Portal account in User Management first, then link it here.'});
 const doc=await DesignTeams.findById('design-teams')||new DesignTeams();
 if(doc.contacts.some(c=>c.unit===unit&&c.kind===kind&&c.email===email&&String(c._id)!==req.body.contactId))return res.status(409).json({error:'This account is already listed.'});
 if(req.body.contactId){const contact=doc.contacts.id(req.body.contactId);if(!contact)return res.status(404).json({error:'Contact not found.'});Object.assign(contact,{unit,kind,name,email,userId:account._id});}else doc.contacts.push({unit,kind,name,email,userId:account._id});doc.updatedBy=req.user._id;await doc.save();logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:req.body.contactId?'BUSINESS_CONTACT_UPDATED':'BUSINESS_CONTACT_ADDED',targetEntity:'DesignTeams',targetId:doc._id,metadata:{unit,kind,email}});res.status(201).json({contacts:doc.contacts});
}catch(e){next(e)}};
exports.deleteContact=async(req,res,next)=>{try{if(req.user.role!=='super_admin')return res.status(403).json({error:'Super Admin only.'});if(!mongoose.Types.ObjectId.isValid(req.params.contactId))return res.status(400).json({error:'Invalid contact.'});const doc=await DesignTeams.findById('design-teams');if(!doc)return res.status(404).json({error:'Contact not found.'});doc.contacts=doc.contacts.filter(c=>String(c._id)!==req.params.contactId);await doc.save();logAuditEvent({actorId:req.user._id,actorRole:req.user.role,action:'BUSINESS_CONTACT_REMOVED',targetEntity:'DesignTeams',targetId:req.params.contactId});res.json({contacts:doc.contacts});}catch(e){next(e)}};
exports.sent=async(req,res,next)=>{try{if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work.'});const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Work not found.'});if(!canReview(req.user)&&item.designerEmail!==req.user.email)return res.status(403).json({error:'Only the assigned creator or Creative Head / Art Director may mark Sent.'});if(item.designType!=='Video & Photography'||item.approvalStatus!=='Approved'||!item.bpEmail)return res.status(409).json({error:'Approve Video work and select its BP recipient first.'});if(item.sentAt)return res.json({item});item.sentAt=new Date();item.sentBy=req.user._id;item.recipientName=item.bpEmail;item.history.push({action:'SENT',actor:req.user._id,actorName:req.user.name,note:`${item.businessUnit} Head: ${item.businessHeadEmail}; BP: ${item.bpEmail}`});await item.save();res.json({item});}catch(e){next(e)}};

// Revision transitions are separate from editing assignment details.
exports.requestRevision=async(req,res,next)=>{try{
 if(!canReview(req.user))return res.status(403).json({error:'Creative Head or Art Director requests revisions.'});
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Design not found.'});
 if(item.handoffTo||item.approvalStatus==='Approved'||item.process!=='Review')return res.status(409).json({error:'Only a pending Review can be returned for revision.'});
 const note=safeText(req.body.note,2000);if(!note)return res.status(400).json({error:'Describe the required revision.'});
 item.revisionNote=note;item.revisionSubmittedAt=undefined;item.process='Revision';item.designChecked=false;item.designChecks=[];item.designApprovals=[];
 item.history.push({action:'REVISION_REQUESTED',actor:req.user._id,actorName:req.user.name,note});await item.save();res.json({item});
}catch(e){next(e)}};
exports.submitRevision=async(req,res,next)=>{try{
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Design not found.'});
 if(item.designerEmail!==req.user.email)return res.status(403).json({error:'Only the assigned designer submits Revised Check.'});
 if(item.approvalStatus==='Approved'||item.handoffTo||!item.revisionNote||!['Revision','Review'].includes(item.process))return res.status(409).json({error:'No revision is awaiting submission.'});
 const checked=payload({...item.toObject(),designDriveUrl:req.body.designDriveUrl||item.designDriveUrl});if(!checked.designDriveUrl)return res.status(400).json({error:'Add the revised Drive link.'});
 item.designDriveUrl=checked.designDriveUrl;item.process='Review';item.designChecked=false;item.designChecks=[];item.revisionSubmittedAt=new Date();
 item.history.push({action:'REVISION_SUBMITTED',actor:req.user._id,actorName:req.user.name,note:'Ready for Creative Head / Art Director review.'});await item.save();res.json({item});
}catch(e){next(e)}};
exports.emailBP=async(req,res,next)=>{try{
 if(!canReview(req.user))return res.status(403).json({error:'Creative Head or Art Director sends approved designs.'});
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Design not found.'});
 if(item.designType!=='Other'||item.approvalStatus!=='Approved'||!item.designDriveUrl||!item.bpEmail)return res.status(409).json({error:'Approve Other design and select its BP before emailing.'});
 if(item.bpEmailMessageId)return res.json({item});
 const result=await require('../services/emailService').sendDesignDelivery({to:item.bpEmail,title:item.title,url:item.designDriveUrl});
 item.bpEmailMessageId=result.messageId;item.sentAt=new Date();item.sentBy=req.user._id;item.status='Completed';item.history.push({action:'BP_EMAIL_SENT',actor:req.user._id,actorName:req.user.name,note:item.bpEmail});await item.save();res.json({item});
}catch(e){next(e)}};

exports.designerCheck=async(req,res,next)=>{try{
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Design not found.'});
 const email=String(req.user.email||'').toLowerCase();
 if(!item.designerEmail||email!==item.designerEmail)return res.status(403).json({error:'Only the designer assigned to this project may use Designer Check.'});
 if(!item.designDriveUrl||!['Review','Approved','Completed'].includes(item.process))return res.status(409).json({error:'Submit the final design link for review before checking.'});
 if((item.designChecks||[]).some(c=>c.slot==='Designer'&&c.email===email&&c.url===item.designDriveUrl))return res.json({item});
 const at=new Date();item.designChecks=[...(item.designChecks||[]).filter(c=>c.slot!=='Designer'),{slot:'Designer',actor:req.user._id,name:req.user.name,email,at,url:item.designDriveUrl}];item.updatedBy=req.user._id;
 item.history.push({action:'DESIGNER_CHECKED',actor:req.user._id,actorName:req.user.name,actorEmail:email,at,designDriveUrl:item.designDriveUrl});
 await item.save();res.json({item});
}catch(e){next(e)}};

// Briefs are private to the assignment creator and the assigned designer.
const ownsBrief=(user,item)=>String(item.createdBy)===String(user._id)||item.designerEmail===String(user.email||'').toLowerCase();
exports.uploadBrief=async(req,res,next)=>{try{
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Work not found.'});
 if(String(item.createdBy)!==String(req.user._id))return res.status(403).json({error:'Only the assignment creator can replace the brief.'});
 const type=req.get('content-type');const data=req.body;
 const valid=Buffer.isBuffer(data)&&data.length>0&&data.length<=8*1024*1024&&((type==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-')||(type==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(type==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255));
 if(!valid)return res.status(400).json({error:'Choose a valid PDF, PNG or JPEG brief up to 8 MB.'});
 item.briefData=data;item.briefName=safeText(req.get('x-file-name')||'Brief',180);item.briefMime=type;item.history.push({action:'BRIEF_UPDATED',actor:req.user._id,actorName:req.user.name});await item.save();res.json({saved:true});
}catch(e){next(e)}};
exports.downloadBrief=async(req,res,next)=>{try{
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id).select('+briefData');if(!item)return res.status(404).json({error:'Work not found.'});
 if(!ownsBrief(req.user,item))return res.status(403).json({error:'This brief is private to the designer and assignment creator.'});
 if(!item.briefData?.length)return res.status(404).json({error:'No brief uploaded.'});
 res.set('Cache-Control','private, no-store');res.set('Content-Type',item.briefMime);res.set('Content-Disposition',`attachment; filename="brief.${item.briefMime==='application/pdf'?'pdf':item.briefMime==='image/png'?'png':'jpg'}"`);res.send(item.briefData);
}catch(e){next(e)}};

exports.acceptProduction=async(req,res,next)=>{try{
 if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({error:'Invalid work ID.'});
 const item=await ImportantWork.findById(req.params.id);if(!item)return res.status(404).json({error:'Project not found.'});
 if(item.merchandisingEmail!==String(req.user.email||'').toLowerCase())return res.status(403).json({error:'Only the assigned Merchandising member can accept this project.'});
 if(item.approvalStatus!=='Approved'||item.handoffTo!=='Production'||item.designType!=='Print')return res.status(409).json({error:'This print design is not ready for Production.'});
 if(!item.productionAcceptedAt){item.productionAcceptedAt=new Date();item.productionAcceptedBy=req.user._id;item.history.push({action:'PRODUCTION_ACCEPTED',actor:req.user._id,actorName:req.user.name,actorEmail:req.user.email});await item.save();}res.json({item});
}catch(e){next(e)}};
