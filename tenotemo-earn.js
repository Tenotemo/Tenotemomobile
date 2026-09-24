/* Tenotemo Earn pilot. All financial and credit mutations happen in Supabase RPCs. */
(()=>{'use strict';
const $=id=>document.getElementById(id),panel=$('earnPanel');
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=String(value);return el};
const money=n=>'R'+(Number(n||0)/100).toFixed(2);
const day=(offset=0)=>{const d=new Date(Date.now()+offset*86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
async function rpc(name,args={}){if(!tUser||!tClient)throw Error('Sign in to use Tenotemo Earn.');const {data,error}=await tClient.rpc(name,args);if(error)throw error;return data}
function note(s){$('earnNotice').textContent=s}
function referral(code){return location.origin+'/api/r?code='+encodeURIComponent(code)}
async function share(c){const link=referral(c.referral_code),message=`${c.title} — ${c.description}\n${link}\n#TenotemoEarn`;
 if(navigator.share){try{await navigator.share({title:c.title,text:message,url:link});note('Share sheet opened. Publication cannot be verified by Tenotemo.');return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(message);note('Campaign message and your referral link copied. Paste it into WhatsApp Status, Facebook or another platform.')}catch{prompt('Copy this approved campaign message and referral link:',message)}
}
async function refresh(){if(!tUser)return note('Sign in to use Tenotemo Earn.');note('Loading your private dashboard…');try{
 const d=await rpc('tenotemo_earn_home');$('earnMemory').textContent=d.memory_credits||0;$('earnApproved').textContent=money(d.approved_cents);$('earnPaid').textContent=money(d.paid_cents);
 const profile=d.advertiser_profile;
 if(profile){$('earnAdvertiserType').value=profile.account_type;$('earnAdvertiserName').value=profile.display_name;$('earnAdvertiserService').value=profile.service_description;$('earnAdvertiserArea').value=profile.service_area;$('earnAdvertiserPackage').value=profile.preferred_package;$('earnAdvertiserStatus').textContent='Application saved · Your account UUID: '+tUser.id+' · Package activation requires payment verification and post approval.';}
 const box=$('earnCampaigns');box.replaceChildren();for(const c of d.campaigns||[]){const card=text('article','');card.className='earn-campaign';card.append(text('h3',c.title),text('p',c.description||'Approved advertiser campaign'));
 card.append(text('small',`Unlock: ${c.credit_cost} Memory Credits · Reward budget: ${money(c.reward_budget_cents)} · Available budget: ${money(c.reward_budget_cents-c.awarded_cents)} · Ends ${new Date(c.ends_at).toLocaleDateString('en-ZA')}`));
 if(c.referral_code){card.append(text('p',`Your indicative unique visits: ${c.indicative_visits||0} · Approved earnings: ${money(c.approved_cents)}`));const b=text('button','📤 Share & Earn');b.onclick=()=>share(c);card.append(b)}
 else{const b=text('button','Unlock campaign');b.onclick=async()=>{b.disabled=true;try{await rpc('tenotemo_earn_join',{p_campaign_id:c.id});note('Campaign unlocked. Share its unique referral link.');await refresh()}catch(e){note(e.message)}finally{b.disabled=false}};card.append(b)}box.append(card)}
 if(!(d.campaigns||[]).length)box.append(text('p','No active campaigns yet. Check back as businesses and service providers join Tenotemo.'));
 note('Your earnings are private. Referral visits are indicative and reviewed before any reward is approved.');
 }catch(e){note('Tenotemo Earn database setup needed: '+e.message)}}
async function loadAdvertisers(){const list=$('earnAdvertiserList');list.replaceChildren();try{const rows=await rpc('tenotemo_admin_advertisers');for(const a of rows||[]){const row=text('p',`${a.display_name} · ${a.account_type} · ${a.service_area} · ${a.preferred_package} · ${a.user_id}`);const b=text('button','Use account');b.onclick=()=>{$('earnCompanyId').value=a.user_id;$('earnPackage').value=a.preferred_package;syncBudget()};row.append(b);list.append(row)}if(!(rows||[]).length)list.append(text('p','No advertiser applications yet.'))}catch(e){list.append(text('p','Advertiser directory unavailable: '+e.message))}}
$('earnOpen').onclick=async()=>{panel.classList.add('open');refresh();try{$('earnAdmin').hidden=!(await rpc('tenotemo_is_admin'));if(!$('earnAdmin').hidden){loadAdvertisers();loadLaunchSetup()}}catch{$('earnAdmin').hidden=true}};
$('earnSaveAdvertiser').onclick=async()=>{const b=$('earnSaveAdvertiser');b.disabled=true;try{await rpc('tenotemo_advertiser_register',{p_type:val('earnAdvertiserType'),p_name:val('earnAdvertiserName'),p_service:val('earnAdvertiserService'),p_area:val('earnAdvertiserArea'),p_package:val('earnAdvertiserPackage')});$('earnAdvertiserStatus').textContent='Application saved. Your account UUID: '+tUser.id+'. No payment or credits have been granted.';note('Advertiser profile saved. Your Spotlight post and EFT require admin approval.');if(!$('earnAdmin').hidden)loadAdvertisers()}catch(e){$('earnAdvertiserStatus').textContent=e.message}finally{b.disabled=false}};
const val=id=>$(id).value.trim();
const budgets={individual:60,starter:300,growth:900,premium:3000};
function syncBudget(){const n=budgets[val('earnPackage')];$('earnBudget').value=String(n);$('earnBudget').max=String(n);$('earnPackageBudgetInfo').textContent=`Maximum player reward budget for this package: R${n}. Multiple active campaigns share this allowance; verified rewards cannot exceed funded campaign budgets.`}
$('earnPackage').addEventListener('change',syncBudget);syncBudget();

let launchAdvertisers=[];
async function loadLaunchSetup(){
 const sel=$('earnLaunchAdvertiser'),previous=sel.value;
 try{const data=await rpc('tenotemo_admin_campaign_setup');launchAdvertisers=data.advertisers||[];
 sel.replaceChildren(new Option('Select advertiser',''));
 for(const a of launchAdvertisers){const active=a.package_key&&new Date(a.expires_at)>new Date();
 const label=`${a.display_name} · ${active?a.package_key+' active':'PACKAGE REQUIRED'} · ${a.user_id.slice(0,8)}`;
 sel.add(new Option(label,a.user_id))}
 if(launchAdvertisers.some(a=>a.user_id===previous))sel.value=previous;
 updateLaunchSelection();
 }catch(e){$('earnLaunchPackageStatus').textContent='Cannot load advertiser packages: '+e.message}
}
function updateLaunchSelection(){
 const a=launchAdvertisers.find(x=>x.user_id===$('earnLaunchAdvertiser').value);
 if(!a){$('earnLaunchPackageStatus').textContent='Select an advertiser with an active package.';return}
 $('earnCompanyId').value=a.user_id;
 if(a.preferred_package&&[...$('earnPackage').options].some(o=>o.value===a.preferred_package)){$('earnPackage').value=a.preferred_package;syncBudget()}
 const active=a.package_key&&new Date(a.expires_at)>new Date();
 const remaining=Math.max(0,(a.reward_allowance_cents||0)-(a.reserved_cents||0));
 $('earnLaunchPackageStatus').textContent=active?`Active ${a.package_key} package · Reward budget available: ${money(remaining)} · ${a.granted_spotlight_credits} package Spotlight Credits`:'No active package. Confirm cleared EFT and grant a package first.';
 $('earnLaunchBudget').max=(remaining/100).toFixed(2);
 $('earnLaunchBudget').value=(remaining/100).toFixed(2);
 $('earnLaunchButton').disabled=!active||remaining<=0;
}
const MEDIA_BUCKET='tenotemo-campaign-media';
const MEDIA_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
function videoFile(f){return f&&f.type.startsWith('video/')}
async function checkCampaignMedia(file){
 if(!file)return;
 if(!MEDIA_TYPES[file.type])throw Error('Choose a JPG, PNG, WebP, MP4, WebM or MOV file.');
 if(file.size>(videoFile(file)?30:5)*1024*1024)throw Error(videoFile(file)?'Video must be 30 MB or smaller.':'Picture must be 5 MB or smaller.');
 if(videoFile(file)){
  const duration=await new Promise((resolve,reject)=>{
   const el=document.createElement('video'),url=URL.createObjectURL(file);
   const done=(value,err)=>{URL.revokeObjectURL(url);el.removeAttribute('src');el.load();err?reject(err):resolve(value)};
   el.preload='metadata';el.onloadedmetadata=()=>done(el.duration);el.onerror=()=>done(null,Error('Cannot read video. Try MP4 or WebM.'));
   el.src=url;
  });
  if(!Number.isFinite(duration)||duration<=0||duration>30)throw Error('Video must be 30 seconds or shorter.');
 }
}
let mediaPreviewURL=null;
$('earnLaunchMedia').addEventListener('change',async()=>{
 const box=$('earnLaunchMediaPreview'),file=$('earnLaunchMedia').files[0];box.replaceChildren();
 if(mediaPreviewURL){URL.revokeObjectURL(mediaPreviewURL);mediaPreviewURL=null}
 if(!file)return;
 try{await checkCampaignMedia(file);mediaPreviewURL=URL.createObjectURL(file);
 const el=document.createElement(videoFile(file)?'video':'img');el.src=mediaPreviewURL;
 el.style.cssText='display:block;max-width:100%;max-height:240px;border-radius:12px';
 if(videoFile(file)){el.controls=true;el.playsInline=true;el.preload='metadata'}
 box.append(el);
 }catch(e){$('earnLaunchMedia').value='';box.textContent=e.message}
});
$('earnLaunchAdvertiser').addEventListener('change',updateLaunchSelection);
$('earnLaunchEnd').value=(()=>{const d=new Date(Date.now()+14*86400000);return d.toISOString().slice(0,10)})();
$('earnLaunchButton').onclick=async()=>{
 const b=$('earnLaunchButton'),a=launchAdvertisers.find(x=>x.user_id===$('earnLaunchAdvertiser').value);
 if(!a)return $('earnLaunchResult').textContent='Select an advertiser first.';
 const cents=Math.round(Number(val('earnLaunchBudget'))*100),cost=Number(val('earnLaunchCost'));
 if(!Number.isSafeInteger(cents)||cents<0||cents>(a.reward_allowance_cents-a.reserved_cents)||!Number.isInteger(cost)||cost<0||cost>50)return $('earnLaunchResult').textContent='Check the budget and Memory Credit cost.';
 if(!val('earnLaunchEnd'))return $('earnLaunchResult').textContent='Choose an end date.';
 if(!val('earnLaunchUrl')||!/^https:\/\/[^\s]+$/i.test(val('earnLaunchUrl')))return $('earnLaunchResult').textContent='Add a complete HTTPS advertiser link so referral links can open the campaign.';
 if(!confirm('Has the advertiser approved this message and have you confirmed its paid package? Publish this Spotlight post and campaign now?'))return;
 b.disabled=true;$('earnLaunchResult').textContent='Publishing…';
 let uploadedPath=null;
 try{
 const file=$('earnLaunchMedia').files[0];
 if(file){
 await checkCampaignMedia(file);
 uploadedPath=`${tUser.id}/campaigns/${crypto.randomUUID()}.${MEDIA_TYPES[file.type]}`;
 $('earnLaunchResult').textContent='Uploading approved campaign media…';
 const result=await tClient.storage.from(MEDIA_BUCKET).upload(uploadedPath,file,{contentType:file.type,upsert:false});
 if(result.error)throw result.error;
 }
 $('earnLaunchResult').textContent='Publishing approved Spotlight and Earn campaign…';
 const id=await rpc('tenotemo_admin_launch_campaign_media',{
 p_company_id:a.user_id,p_message:val('earnLaunchMessage'),p_title:val('earnLaunchTitle'),
 p_description:val('earnLaunchDescription'),p_target_url:val('earnLaunchUrl'),
 p_budget_cents:cents,p_credit_cost:cost,p_media_path:uploadedPath,p_ends_at:new Date(val('earnLaunchEnd')+'T23:59:59+02:00').toISOString()});
 $('earnLaunchResult').textContent='✅ Published! Campaign '+id+' is now active in Tenotemo Earn and its approved post is on Spotlight.';
 await refresh();await loadLaunchSetup();
 }catch(e){
 if(uploadedPath){const removed=await tClient.storage.from(MEDIA_BUCKET).remove([uploadedPath]);if(removed.error)console.warn('Orphan media cleanup:',removed.error.message)}
 $('earnLaunchResult').textContent='Not published: '+e.message
 }
 finally{b.disabled=false;updateLaunchSelection()}
};

$('earnGrantPackage').onclick=async()=>{if(!confirm('Have you verified cleared EFT funds? This will grant company exposure immediately.'))return;try{await rpc('tenotemo_admin_company_package',{p_company_id:val('earnCompanyId'),p_package:val('earnPackage')});note('Advertiser package granted. You can now publish a campaign below.');loadAdvertisers();await loadLaunchSetup()}catch(e){note(e.message)}};
$('earnCreateCampaign').onclick=async()=>{try{const cents=Math.round(Number(val('earnBudget'))*100);const cost=Number(val('earnCost'));if(!Number.isSafeInteger(cents)||cents<0||cents>budgets[val('earnPackage')]*100||!Number.isInteger(cost))throw Error('Invalid budget or credit cost');const end=new Date(val('earnEnd')+'T23:59:59+02:00').toISOString();const id=await rpc('tenotemo_admin_campaign',{p_company_id:val('earnCompanyId'),p_post_id:val('earnPostId'),p_title:val('earnTitle'),p_description:val('earnDescription'),p_budget_cents:cents,p_credit_cost:cost,p_ends_at:end});note('Campaign created: '+id);await refresh()}catch(e){note(e.message)}};
$('earnApproveReward').onclick=async()=>{if(!confirm('Confirm referral/customer evidence was independently reviewed and the company reward budget is funded?'))return;try{const cents=Math.round(Number(val('earnRewardAmount'))*100);if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Invalid amount');await rpc('tenotemo_admin_reward',{p_enrolment_id:val('earnEnrolment'),p_amount_cents:cents,p_reason:val('earnReason')});note('Reward approved; pay by verified manual EFT.');await refresh()}catch(e){note(e.message)}};$('earnClose').onclick=()=>panel.classList.remove('open');
$('earnClaim').onclick=async()=>{const b=$('earnClaim');b.disabled=true;try{const d=$('earnClaimDate').value;const rows=await rpc('tenotemo_claim_memory_day',{p_date:d});const r=rows[0];note(`Claimed ${r.completion_credits} daily-challenge credits + ${r.top50_credits} Top 50 credits!`);await refresh();note(`Claimed ${r.completion_credits} challenge + ${r.top50_credits} ranking credits.`)}catch(e){note(e.message)}finally{b.disabled=false}};
$('earnClaimDate').value=day(-1);$('earnClaimDate').max=day(-1);
// Spotlight Share & Earn button only appears when its post is tied to an active campaign.
window.tenotemoEarnShareSpotlight=async postId=>{if(!tUser)return note('Sign in first.');panel.classList.add('open');await refresh();const d=await rpc('tenotemo_earn_home');const c=(d.campaigns||[]).find(x=>x.spotlight_post_id===postId);if(c)note('Find the advertiser campaign below to unlock and share it.')};
})();
