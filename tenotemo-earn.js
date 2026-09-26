/* Tenotemo Earn pilot. All financial and credit mutations happen in Supabase RPCs. */
(()=>{'use strict';
const $=id=>document.getElementById(id),panel=$('earnPanel');
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=String(value);return el};
const money=n=>'R'+(Number(n||0)/100).toFixed(2);
const day=(offset=0)=>{const d=new Date(Date.now()+offset*86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
async function rpc(name,args={}){if(!tUser||!tClient)throw Error('Sign in to use Tenotemo Earn.');const {data,error}=await tClient.rpc(name,args);if(error)throw error;return data}
function note(s){$('earnNotice').textContent=s}
function referral(code){return location.origin+'/api/c?code='+encodeURIComponent(code)}
function directReferral(code){return location.origin+'/api/r?code='+encodeURIComponent(code)}
function shareMessage(c){return `${c.title} — ${c.description||'Approved advertiser promotion'}\n${referral(c.referral_code)}\n#TenotemoEarn`}
async function copyCampaignLink(c){const message=shareMessage(c);try{await navigator.clipboard.writeText(message);note('Campaign message and your unique referral link copied. Paste them alongside your picture or video.')}catch{prompt('Copy your campaign message and referral link:',message)}}
async function share(c){const link=referral(c.referral_code),message=shareMessage(c);
 if(navigator.share){try{await navigator.share({title:c.title,text:message});note('Share sheet opened. The campaign link has a picture or video thumbnail where the platform supports previews.');return}catch(e){if(e.name==='AbortError')return}}
 await copyCampaignLink(c);
}
async function shareMedia(c){
 if(!c.referral_code)return note('Unlock this campaign first.');
 const {data:posts,error}=await tClient.from('tenotemo_spotlight_posts').select('image_path,status').eq('id',c.spotlight_post_id).limit(1);
 if(error)throw error;const path=posts?.[0]?.image_path;
 if(!path)return note('This campaign has no approved picture or video. Use Share Campaign Link instead.');
 if(posts[0].status!=='approved')return note('This campaign is not currently available for sharing.');
 const bucket=/\/campaigns\//.test(path)?'tenotemo-campaign-media':'tenotemo-spotlight';
 const {data:signed,error:signError}=await tClient.storage.from(bucket).createSignedUrl(path,300);
 if(signError||!signed?.signedUrl)throw signError||Error('Cannot access approved media.');
 const response=await fetch(signed.signedUrl);if(!response.ok)throw Error('Media download failed.');
 const blob=await response.blob();const ext=path.split('.').pop().toLowerCase();const type=blob.type||({'mov':'video/quicktime','mp4':'video/mp4','webm':'video/webm','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp'}[ext]);
 const file=new File([blob],`tenotemo-campaign.${ext}`,{type});
 const message=shareMessage(c);
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],text:message,title:c.title});note('Media shared or share sheet opened. Some apps omit the link when sharing a file; use Copy Referral Link if needed.');return}catch(e){if(e.name==='AbortError')return}
 }
 const objectURL=URL.createObjectURL(file),a=document.createElement('a');a.href=objectURL;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),60000);
 await copyCampaignLink(c);note('Approved media downloaded. Add it to your post or Status, and paste your copied unique referral link.');
}
async function refresh(){if(!tUser)return note('Sign in to use Tenotemo Earn.');note('Loading your private dashboard…');try{
 const d=await rpc('tenotemo_earn_home');$('earnMemory').textContent=d.memory_credits||0;$('earnProvisional').textContent=money(d.provisional_cents);$('earnApproved').textContent=money(d.approved_cents);$('earnPaid').textContent=money(d.paid_cents);
 const profile=d.advertiser_profile;
 if(profile){$('earnAdvertiserType').value=profile.account_type;$('earnAdvertiserName').value=profile.display_name;$('earnAdvertiserService').value=profile.service_description;$('earnAdvertiserArea').value=profile.service_area;$('earnAdvertiserPackage').value=profile.preferred_package;$('earnAdvertiserStatus').textContent='Application saved · Your account UUID: '+tUser.id+' · Package activation requires payment verification and post approval.';}
 const box=$('earnCampaigns');box.replaceChildren();for(const c of d.campaigns||[]){const card=text('article','');card.className='earn-campaign';card.append(text('h3',c.title),text('p',c.description||'Approved advertiser campaign'));
 card.append(text('small',`Unlock: ${c.credit_cost} Memory Credits · Reward budget: ${money(c.reward_budget_cents)} · Available budget: ${money(c.reward_budget_cents-c.awarded_cents)} · Ends ${new Date(c.ends_at).toLocaleDateString('en-ZA')}`));
 if(c.referral_code){card.append(text('p',`Provisional: ${money(c.provisional_cents)} · Earned: ${money(c.approved_cents)} · Share proofs today: ${c.share_platforms_today||0}/2`));const b=text('button','🔗 Share Campaign Link');b.onclick=()=>share(c);card.append(b);const m=text('button','🖼️ Share Picture / Video');m.style.marginLeft='6px';m.onclick=async()=>{m.disabled=true;try{await shareMedia(c)}catch(e){note('Cannot share media: '+e.message)}finally{m.disabled=false}};card.append(m);const cp=text('button','📋 Copy Referral Link');cp.style.marginLeft='6px';cp.onclick=()=>copyCampaignLink(c);card.append(cp);
 const proof=document.createElement('div');proof.style.cssText='margin-top:10px;padding:10px;border:1px solid #cbd5e1;border-radius:10px';proof.append(text('strong','Submit proof of share · R1 per verified platform, max R2/day'));
 const platform=document.createElement('select');for(const [v,l] of [['whatsapp','WhatsApp'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['x','X'],['other','Other social platform']])platform.add(new Option(l,v));
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';
 const submit=text('button','Upload screenshot for R1 provisional');submit.type='button';submit.onclick=async()=>{if(!file.files[0])return note('Choose a screenshot showing the campaign was posted.');if(file.files[0].size>5*1024*1024)return note('Screenshot must be 5 MB or smaller.');submit.disabled=true;let path='';try{path=`${tUser.id}/share-proofs/${crypto.randomUUID()}.${(file.files[0].name.split('.').pop()||'jpg').toLowerCase()}`;const up=await tClient.storage.from('tenotemo-share-proofs').upload(path,file.files[0],{contentType:file.files[0].type,upsert:false});if(up.error)throw up.error;await rpc('tenotemo_submit_share_proof',{p_campaign_id:c.id,p_platform:platform.value,p_proof_path:path});note('R1 provisional share proof submitted. Add a second qualifying platform for up to R2.');await refresh()}catch(e){if(path)await tClient.storage.from('tenotemo-share-proofs').remove([path]);note('Proof not submitted: '+e.message)}finally{submit.disabled=false}};
 proof.append(document.createElement('br'),platform,file,submit);card.append(proof)}
 else{const b=text('button','Unlock campaign');b.onclick=async()=>{b.disabled=true;try{await rpc('tenotemo_earn_join',{p_campaign_id:c.id});note('Campaign unlocked. Share its unique referral link.');await refresh()}catch(e){note(e.message)}finally{b.disabled=false}};card.append(b)}box.append(card)}
 if(!(d.campaigns||[]).length)box.append(text('p','No active campaigns yet. Check back as businesses and service providers join Tenotemo.'));
 note('Your earnings are private. Referral visits are indicative and reviewed before any reward is approved.');
 }catch(e){note('Tenotemo Earn database setup needed: '+e.message)}}
async function loadAdvertisers(){const list=$('earnAdvertiserList');list.replaceChildren();try{const rows=await rpc('tenotemo_admin_advertiser_search',{p_search:val('earnAdvertiserSearch')});for(const a of rows||[]){const row=text('p',`${a.username} · ${a.display_name} · ${a.account_type} · ${a.preferred_package}`);const b=text('button','Select advertiser');b.onclick=()=>{$('earnCompanyId').value=a.user_id;$('earnPackage').value=a.preferred_package;syncBudget();$('earnSelectedAdvertiser').textContent=`Selected: ${a.username} · EFT reference: ${a.payment_reference}`};row.append(b);list.append(row)}if(!(rows||[]).length)list.append(text('p','No advertiser applications found.'))}catch(e){list.append(text('p','Advertiser directory unavailable: '+e.message))}}
$('earnAdvertiserSearchBtn').onclick=loadAdvertisers;$('earnAdvertiserSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadAdvertisers()}});
$('earnOpen').onclick=async()=>{panel.classList.add('open');refresh();try{$('earnAdmin').hidden=!(await rpc('tenotemo_is_admin'));if(!$('earnAdmin').hidden){loadAdvertisers();loadLaunchSetup();loadManagedCampaigns();loadProofReviews()}}catch{$('earnAdmin').hidden=true}};
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
 await refresh();await loadLaunchSetup();await loadManagedCampaigns();
 }catch(e){
 if(uploadedPath){const removed=await tClient.storage.from(MEDIA_BUCKET).remove([uploadedPath]);if(removed.error)console.warn('Orphan media cleanup:',removed.error.message)}
 $('earnLaunchResult').textContent='Not published: '+e.message
 }
 finally{b.disabled=false;updateLaunchSelection()}
};

let managedCampaigns=[],editingCampaign=null,editPreviewURL=null;
const manageStatus=s=>$('earnManageNotice').textContent=s;
function editDate(iso){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso))}
async function loadManagedCampaigns(){
 const box=$('earnManagedCampaigns');box.replaceChildren();manageStatus('Loading campaigns…');
 try{managedCampaigns=await rpc('tenotemo_admin_manage_campaigns');
 if(!managedCampaigns.length)box.append(text('p','No linked Earn campaigns yet. Older standalone Spotlight posts are not Earn campaigns.'));
 for(const c of managedCampaigns){const row=text('article','');row.className='earn-campaign';
 row.append(text('h4',`${c.title} · ${c.status.toUpperCase()}`),text('p',`${c.advertiser_name} · ${c.message||'No message'}`),text('small',`Reward budget ${money(c.reward_budget_cents)} · Approved ${money(c.awarded_cents)} · ${c.enrolments} enrolled · Ends ${new Date(c.ends_at).toLocaleDateString('en-ZA')} · Spotlight ${c.post_status}`));
 if(c.image_path){const p=text('p',c.image_path.match(/\.(mp4|webm|mov)$/i)?'🎬 Video attached':'🖼️ Picture attached');row.append(p)}
 if(c.status!=='closed'){
 const edit=text('button','✏️ Edit');edit.onclick=()=>openManagedEdit(c);row.append(edit);
 const change=text('button',c.status==='active'?'⏸ Pause':'▶ Resume');change.onclick=()=>changeManagedStatus(c,c.status==='active'?'paused':'active');row.append(change);
 const end=text('button','⛔ End campaign');end.onclick=()=>changeManagedStatus(c,'closed');row.append(end);
 }box.append(row)}manageStatus(`Showing ${managedCampaigns.length} linked campaigns.`)
 }catch(e){manageStatus('Unable to load campaigns: '+e.message)}
}
function openManagedEdit(c){editingCampaign=c;$('earnManageEditor').hidden=false;
 $('earnManageEditorHeading').textContent='Edit: '+c.title;
 for(const [id,v] of [['earnEditTitle',c.title],['earnEditMessage',c.message],['earnEditDescription',c.description],['earnEditUrl',c.target_url||''],['earnEditCost',c.credit_cost],['earnEditEnd',editDate(c.ends_at)]])$(id).value=v??'';
 $('earnEditMedia').value='';$('earnEditMediaPreview').replaceChildren();
 $('earnManageEditor').scrollIntoView({behavior:'smooth',block:'start'});
 manageStatus('Editing existing campaign. Leave the media field empty to keep its current picture or video.');
}
$('earnManageRefresh').onclick=loadManagedCampaigns;
$('earnEditCancel').onclick=()=>{editingCampaign=null;$('earnManageEditor').hidden=true};
$('earnEditMedia').onchange=async()=>{const file=$('earnEditMedia').files[0],box=$('earnEditMediaPreview');box.replaceChildren();if(editPreviewURL)URL.revokeObjectURL(editPreviewURL);editPreviewURL=null;if(!file)return;
 try{await checkCampaignMedia(file);editPreviewURL=URL.createObjectURL(file);const el=document.createElement(videoFile(file)?'video':'img');el.src=editPreviewURL;el.style.cssText='display:block;max-width:100%;max-height:220px';if(videoFile(file)){el.controls=true;el.playsInline=true}box.append(el)}catch(e){$('earnEditMedia').value='';manageStatus(e.message)}};
$('earnEditSave').onclick=async()=>{const c=editingCampaign;if(!c)return;
 const b=$('earnEditSave'),file=$('earnEditMedia').files[0],url=val('earnEditUrl'),cost=Number(val('earnEditCost'));
 if(!/^https:\/\/[^\s]+$/i.test(url))return manageStatus('A complete HTTPS advertiser link is required.');
 if(!Number.isInteger(cost)||cost<0||cost>50)return manageStatus('Memory Credit cost must be 0–50.');
 if(!val('earnEditEnd'))return manageStatus('Choose an end date.');
 if(!confirm('Save these changes to the existing Spotlight post and Earn campaign?'))return;
 let uploadedPath=null;b.disabled=true;
 try{if(file){await checkCampaignMedia(file);uploadedPath=`${tUser.id}/campaigns/${crypto.randomUUID()}.${MEDIA_TYPES[file.type]}`;manageStatus('Uploading replacement media…');const u=await tClient.storage.from(MEDIA_BUCKET).upload(uploadedPath,file,{contentType:file.type,upsert:false});if(u.error)throw u.error}
 manageStatus('Saving linked campaign and Spotlight post…');await rpc('tenotemo_admin_edit_campaign',{p_campaign_id:c.id,p_title:val('earnEditTitle'),p_message:val('earnEditMessage'),p_description:val('earnEditDescription'),p_target_url:url,p_media_path:uploadedPath,p_credit_cost:cost,p_ends_at:new Date(val('earnEditEnd')+'T23:59:59+02:00').toISOString()});
 editingCampaign=null;$('earnManageEditor').hidden=true;await loadManagedCampaigns();await refresh();manageStatus('✅ Campaign updated. Existing referral records and approved rewards are retained.');
 }catch(e){if(uploadedPath){const r=await tClient.storage.from(MEDIA_BUCKET).remove([uploadedPath]);if(r.error)console.warn('Media cleanup:',r.error.message)}manageStatus('Not saved: '+e.message)}finally{b.disabled=false}};
async function changeManagedStatus(c,status){const wording=status==='closed'?'Permanently end this campaign? It cannot be resumed. Player referral and reward records remain.':status==='paused'?'Pause this campaign and hide its Spotlight post?':'Resume this campaign and show its Spotlight post?';if(!confirm(wording))return;
 try{await rpc('tenotemo_admin_campaign_status',{p_campaign_id:c.id,p_status:status});if(editingCampaign?.id===c.id){editingCampaign=null;$('earnManageEditor').hidden=true}await loadManagedCampaigns();await refresh();manageStatus(`Campaign ${status}. Spotlight visibility updated.`)}catch(e){manageStatus('Status not changed: '+e.message)}}

$('earnGrantPackage').onclick=async()=>{if(!confirm('Have you verified cleared EFT funds? This will grant company exposure immediately.'))return;try{await rpc('tenotemo_admin_company_package',{p_company_id:val('earnCompanyId'),p_package:val('earnPackage')});note('Advertiser package granted. You can now publish a campaign below.');loadAdvertisers();await loadLaunchSetup()}catch(e){note(e.message)}};
$('earnCreateCampaign').onclick=async()=>{try{const cents=Math.round(Number(val('earnBudget'))*100);const cost=Number(val('earnCost'));if(!Number.isSafeInteger(cents)||cents<0||cents>budgets[val('earnPackage')]*100||!Number.isInteger(cost))throw Error('Invalid budget or credit cost');const end=new Date(val('earnEnd')+'T23:59:59+02:00').toISOString();const id=await rpc('tenotemo_admin_campaign',{p_company_id:val('earnCompanyId'),p_post_id:val('earnPostId'),p_title:val('earnTitle'),p_description:val('earnDescription'),p_budget_cents:cents,p_credit_cost:cost,p_ends_at:end});note('Campaign created: '+id);await refresh()}catch(e){note(e.message)}};
async function searchPlayerEnrolments(){const box=$('earnPlayerResults');box.replaceChildren();try{const rows=await rpc('tenotemo_admin_player_enrolments',{p_search:val('earnPlayerSearch')});for(const r of rows||[]){const row=text('p',`${r.username} · ${r.campaign_title} · Earned ${money(r.approved_cents)} · Paid ${money(r.paid_cents)}`);const b=text('button','Select');b.type='button';b.onclick=()=>{$('earnEnrolment').value=r.enrolment_id;$('earnSelectedPlayer').textContent=`Selected: ${r.username} · ${r.campaign_title} · EFT reference: ${r.payment_reference}`};row.append(b);box.append(row)}if(!(rows||[]).length)box.append(text('p','No enrolled players found.'))}catch(e){box.append(text('p','Player search unavailable: '+e.message))}}
$('earnPlayerSearchBtn').onclick=searchPlayerEnrolments;$('earnPlayerSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPlayerEnrolments()}});
async function loadProofReviews(){const box=$('earnProofReviews');box.replaceChildren();try{const rows=await rpc('tenotemo_admin_pending_share_proofs');for(const r of rows||[]){const row=document.createElement('article');row.className='earn-campaign';row.append(text('strong',`${r.username} · ${r.campaign_title}`),text('p',`${r.platform} · ${new Date(r.submitted_at).toLocaleString('en-ZA')} · Provisional ${money(r.provisional_cents)}`),text('p',`EFT reference when paid: ${r.payment_reference}`));const view=text('button','View screenshot');view.type='button';view.onclick=async()=>{const x=await tClient.storage.from('tenotemo-share-proofs').createSignedUrl(r.proof_path,300);if(x.error)return note(x.error.message);window.open(x.data.signedUrl,'_blank','noopener')};const yes=text('button','Approve R1');yes.type='button';yes.onclick=async()=>{if(!confirm(`Approve ${money(r.provisional_cents)} for ${r.username}?`))return;try{await rpc('tenotemo_admin_review_share_proof',{p_proof_id:r.proof_id,p_approve:true,p_note:'Screenshot verified by admin'});note(`${money(r.provisional_cents)} earned by ${r.username}. EFT reference: ${r.payment_reference}`);await loadProofReviews();await refresh()}catch(e){note(e.message)}};const no=text('button','Reject');no.type='button';no.onclick=async()=>{const why=prompt('Reason for rejection:','Proof does not show a qualifying published campaign share');if(why===null)return;try{await rpc('tenotemo_admin_review_share_proof',{p_proof_id:r.proof_id,p_approve:false,p_note:why});await loadProofReviews()}catch(e){note(e.message)}};row.append(view,yes,no);box.append(row)}if(!(rows||[]).length)box.append(text('p','No share proofs waiting for review.'))}catch(e){box.append(text('p','Proof review unavailable: '+e.message))}}
$('earnProofRefresh').onclick=loadProofReviews;
$('earnApproveReward').onclick=async()=>{if(!confirm('Confirm referral/customer evidence was independently reviewed and the company reward budget is funded?'))return;try{const cents=Math.round(Number(val('earnRewardAmount'))*100);if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Invalid amount');await rpc('tenotemo_admin_reward',{p_enrolment_id:val('earnEnrolment'),p_amount_cents:cents,p_reason:val('earnReason')});note('Reward approved and added to earned balance. Use the selected player username as the EFT payment reference.');await refresh()}catch(e){note(e.message)}};$('earnClose').onclick=()=>panel.classList.remove('open');
$('earnClaim').onclick=async()=>{const b=$('earnClaim');b.disabled=true;try{const d=$('earnClaimDate').value;const rows=await rpc('tenotemo_claim_memory_day',{p_date:d});const r=rows[0];note(`Claimed ${r.completion_credits} daily-challenge credits + ${r.top50_credits} Top 50 credits!`);await refresh();note(`Claimed ${r.completion_credits} challenge + ${r.top50_credits} ranking credits.`)}catch(e){note(e.message)}finally{b.disabled=false}};
$('earnClaimDate').value=day(-1);$('earnClaimDate').max=day(-1);
// Spotlight Share & Earn button only appears when its post is tied to an active campaign.
window.tenotemoEarnShareSpotlight=async postId=>{if(!tUser)return note('Sign in first.');panel.classList.add('open');await refresh();const d=await rpc('tenotemo_earn_home');const c=(d.campaigns||[]).find(x=>x.spotlight_post_id===postId);if(c)note('Find the advertiser campaign below to unlock and share it.')};
})();
