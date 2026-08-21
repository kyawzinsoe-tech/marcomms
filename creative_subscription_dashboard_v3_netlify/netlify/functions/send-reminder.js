exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return {statusCode:405,body:JSON.stringify({error:"Method not allowed"})};
  try {
    const data = JSON.parse(event.body || "{}");
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.REMINDER_FROM_EMAIL;
    if (!apiKey || !from) return {statusCode:500,body:JSON.stringify({error:"Set RESEND_API_KEY and REMINDER_FROM_EMAIL in Netlify."})};
    if (!data.to) return {statusCode:400,body:JSON.stringify({error:"Recipient required"})};
    const html = `<div style="font-family:Arial,sans-serif"><h2>Creative Subscription Alert</h2><p><b>${data.product || ""}</b> — ${data.tool || ""}</p><p>Status: <b>${data.status || ""}</b></p><p>Expiry: <b>${data.expiry || ""}</b></p><p>Account: ${data.account || "—"}</p><p>Please review or renew this subscription.</p></div>`;
    const r = await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[data.to],subject:`[Subscription Alert] ${data.product || "Subscription"} — ${data.status || "Reminder"}`,html})});
    const out = await r.json();
    if (!r.ok) return {statusCode:r.status,body:JSON.stringify({error:out.message || "Email send failed"})};
    return {statusCode:200,body:JSON.stringify({ok:true,id:out.id})};
  } catch(e) { return {statusCode:500,body:JSON.stringify({error:e.message})}; }
};