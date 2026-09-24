/* Public campaign preview: bots see Open Graph metadata; human visits do not count
   until the visitor explicitly opens the advertiser through /api/r. */
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=s=>esc(s).replace(/\n/g,' ');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 if(req.method!=='GET')return res.status(405).end('Method not allowed');
 const code=typeof req.query.code==='string'?req.query.code:'';
 if(!/^[0-9a-f]{36}$/.test(code))return res.status(404).end('Campaign not found');
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return res.status(503).end('Campaign preview is not configured');
 const root=base.replace(/\/$/,'');const headers={apikey:key,Authorization:'Bearer '+key};
 try{
 const query='tenotemo_earn_enrolments?select=campaign:tenotemo_earn_campaigns!inner(title,description,status,starts_at,ends_at,post:tenotemo_spotlight_posts!inner(message,image_path,status,target_url))&referral_code=eq.'+code+'&limit=1';
 const r=await fetch(root+'/rest/v1/'+query,{headers});if(!r.ok)throw Error('Campaign lookup failed');
 const rows=await r.json(),c=rows[0]?.campaign,p=c?.post;
 if(!c||c.status!=='active'||p?.status!=='approved'||new Date(c.starts_at)>new Date()||new Date(c.ends_at)<=new Date())return res.status(404).end('Campaign not available');
 const origin='https://'+(req.headers['x-forwarded-host']||req.headers.host||'tenotemomobile.vercel.app').split(',')[0].replace(/[^a-z0-9.:-]/gi,'');
 const link=origin+'/api/c?code='+encodeURIComponent(code),destination=origin+'/api/r?code='+encodeURIComponent(code);
 let media='',isVideo=false;
 if(p.image_path){const path=p.image_path;isVideo=/\.(mp4|webm|mov)$/i.test(path);
 const bucket=path.includes('/campaigns/')?'tenotemo-campaign-media':'tenotemo-spotlight';
 const sign=await fetch(root+'/storage/v1/object/sign/'+bucket+'/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:86400})});
 if(sign.ok){const data=await sign.json();if(data.signedURL||data.signedUrl){const signed=data.signedURL||data.signedUrl;media=signed.startsWith('http')?signed:root+'/storage/v1'+signed}}
 }
 const title=xml(c.title),description=xml((p.message||c.description||'Approved advertiser campaign').slice(0,250));
 const image=media&&!isVideo?media:'';
 const head=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Tenotemo Earn</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="Tenotemo Earn"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${xml(link)}">${image?`<meta property="og:image" content="${xml(image)}"><meta name="twitter:card" content="summary_large_image">`:''}${isVideo&&media?`<meta property="og:video" content="${xml(media)}"><meta property="og:video:type" content="${p.image_path.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4'}">`:''}`;
 const visual=media?(isVideo?`<video controls playsinline preload="metadata" src="${xml(media)}"></video>`:`<img src="${xml(media)}" alt="Approved advertiser picture">`):'';
 res.status(200).end(`<!doctype html><html lang="en"><head>${head}<style>body{margin:0;background:#edf4fa;color:#142c3b;font:16px system-ui,sans-serif}main{max-width:600px;margin:30px auto;padding:24px;background:white;border-radius:18px;box-shadow:0 6px 28px #1232}img,video{width:100%;max-height:440px;object-fit:contain;border-radius:12px}a.button{display:block;background:#047857;color:white;text-align:center;padding:15px;border-radius:10px;font-weight:700;text-decoration:none}small{color:#536b78}</style></head><body><main><small>Tenotemo Earn · Approved advertiser promotion</small><h1>${title}</h1>${visual}<p>${description}</p><a class="button" href="${xml(destination)}" rel="nofollow">Open advertiser's website / contact link</a><p><small>Player rewards depend on independently verified qualifying results, not shares or clicks alone. Campaign media is provided by the advertiser.</small></p></main></body></html>`);
 }catch(e){console.error('Campaign preview:',e.message);res.status(503).end('Campaign preview temporarily unavailable')}
};
