/* Vercel serverless referral redirect. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
   TENOTEMO_REFERRAL_SALT as server-side environment variables. NEVER put these in HTML. */
const crypto=require('crypto');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end('Method not allowed');
 const code=typeof req.query.code==='string'?req.query.code:'';
 if(!/^[0-9a-f]{36}$/.test(code))return res.status(404).end('Campaign link not found');
 const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY, salt=process.env.TENOTEMO_REFERRAL_SALT;
 if(!base||!key||!salt)return res.status(503).end('Campaign tracking is not configured');
 const root=base.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const q='tenotemo_earn_enrolments?select=id,campaign:tenotemo_earn_campaigns!inner(status,starts_at,ends_at,post:tenotemo_spotlight_posts!inner(status,target_url))&referral_code=eq.'+code+'&limit=1';
  const response=await fetch(root+q,{headers});if(!response.ok)throw Error('Lookup failed');
  const rows=await response.json(),row=rows[0],campaign=row?.campaign,post=campaign?.post;
  if(!row||campaign.status!=='active'||post?.status!=='approved'||new Date(campaign.starts_at)>new Date()||new Date(campaign.ends_at)<=new Date())return res.status(404).end('Campaign unavailable');
  const target=new URL(post.target_url);if(target.protocol!=='https:')return res.status(404).end('Campaign link unavailable');
  const ip=(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();
  const ua=String(req.headers['user-agent']||'').slice(0,256);
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const hash=crypto.createHmac('sha256',salt).update(day+'|'+ip+'|'+ua).digest('hex');
  // Indicative unique visits only. No automated payment or cash reward from these counts.
  const insert=await fetch(root+'tenotemo_earn_visits?on_conflict=enrolment_id,visitor_hash,visit_day',{
   method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},
   body:JSON.stringify({enrolment_id:row.id,visitor_hash:hash,visit_day:day})});
  if(!insert.ok)console.error('Referral count could not be recorded',insert.status);
  return res.redirect(302,target.href);
 }catch(e){console.error('Referral handler:',e.message);return res.status(503).end('Campaign link temporarily unavailable')}
};
