import React,{useState} from 'react';
export function designPreviewUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';let m;
 if(u.hostname==='docs.google.com'&&(m=u.pathname.match(/^\/presentation\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)))return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false`;
 if(u.hostname==='drive.google.com'){const id=u.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1]||u.searchParams.get('id');if(id&&/^[a-zA-Z0-9_-]+$/.test(id)){const out=new URL(`https://drive.google.com/file/d/${id}/preview`);if(u.searchParams.get('resourcekey'))out.searchParams.set('resourcekey',u.searchParams.get('resourcekey'));return out.toString();}}
 }catch{}return '';
}
export function DesignReviewFile({url,title,previewOnly=false}){
 const[open,setOpen]=useState(false),[sampleLink,setSampleLink]=useState('');
 const link=previewOnly?sampleLink:url,embed=designPreviewUrl(link);
 return <div className="design-review-file"><div className="design-review-file-actions">{link&&embed&&<a className="btn btn-outline" href={link} target="_blank" rel="noopener noreferrer">Open Drive / Slides ↗</a>}<button type="button" className="btn btn-outline" onClick={()=>setOpen(true)}>Preview Design / Slides</button></div>
 {open&&<div className="modal-overlay" onClick={()=>setOpen(false)}><section className="design-preview-dialog" role="dialog" aria-modal="true" aria-label={`Design Preview · ${title}`} onClick={e=>e.stopPropagation()}><header><div><h3>{title}</h3><p>Design Review · Google Drive / Presentation Slides</p></div><button type="button" className="btn btn-outline" onClick={()=>setOpen(false)}>Close ✕</button></header>
 {previewOnly&&<label>စမ်းကြည့်ရန် Drive File သို့မဟုတ် Google Slides Link အပြည့်ထည့်ပါ<input type="url" value={sampleLink} onChange={e=>setSampleLink(e.target.value)} placeholder="https://docs.google.com/presentation/d/…/edit"/><small>ဤ Preview တွင်သာ အသုံးပြုမည်။ Database ထဲ မသိမ်းပါ။</small></label>}
 {embed?<iframe title={`Design preview: ${title}`} src={embed} allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="design-preview-empty">Drive File သို့မဟုတ် Google Slides Link ထည့်ပြီး စစ်ဆေးနိုင်ပါသည်။ Folder link ကို Preview မပြနိုင်ပါ။</div>}
 <footer><p>Restricted ဖိုင်ဆိုလျှင် Access ရှိသော Google Account ဖြင့်ဝင်ထားရန်လိုပါသည်။ Preview မပေါ်လျှင် Open Drive / Slides ကိုနှိပ်ပါ။</p>{embed&&<a className="btn btn-primary" href={link} target="_blank" rel="noopener noreferrer">Open Drive / Slides ↗</a>}</footer></section></div>}</div>;
}
