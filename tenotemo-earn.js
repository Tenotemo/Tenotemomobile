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
 const box=$('earnCampaigns');box.replaceChildren();for(const c of d.campaigns||[]){const card=text('article','');card.className='earn-campaign';card.append(text('h3',c.title),text('p',c.description||'Approved company campaign'));
 card.append(text('small',`Unlock: ${c.credit_cost} Memory Credits · Reward budget: ${money(c.reward_budget_cents)} · Available budget: ${money(c.reward_budget_cents-c.awarded_cents)} · Ends ${new Date(c.ends_at).toLocaleDateString('en-ZA')}`));
 if(c.referral_code){card.append(text('p',`Your indicative unique visits: ${c.indicative_visits||0} · Approved earnings: ${money(c.approved_cents)}`));const b=text('button','📤 Share & Earn');b.onclick=()=>share(c);card.append(b)}
 else{const b=text('button','Unlock campaign');b.onclick=async()=>{b.disabled=true;try{await rpc('tenotemo_earn_join',{p_campaign_id:c.id});note('Campaign unlocked. Share its unique referral link.');await refresh()}catch(e){note(e.message)}finally{b.disabled=false}};card.append(b)}box.append(card)}
 if(!(d.campaigns||[]).length)box.append(text('p','No active campaigns yet. Check back as companies join Tenotemo.'));
 note('Your earnings are private. Referral visits are indicative and reviewed before any reward is approved.');
 }catch(e){note('Tenotemo Earn database setup needed: '+e.message)}}
$('earnOpen').onclick=async()=>{panel.classList.add('open');refresh();try{$('earnAdmin').hidden=!(await rpc('tenotemo_is_admin'))}catch{$('earnAdmin').hidden=true}};
const val=id=>$(id).value.trim();
$('earnGrantPackage').onclick=async()=>{if(!confirm('Have you verified cleared EFT funds? This will grant company exposure immediately.'))return;try{await rpc('tenotemo_admin_company_package',{p_company_id:val('earnCompanyId'),p_package:val('earnPackage')});note('Company package granted. Verify Spotlight post approval before creating its campaign.')}catch(e){note(e.message)}};
$('earnCreateCampaign').onclick=async()=>{try{const cents=Math.round(Number(val('earnBudget'))*100);const cost=Number(val('earnCost'));if(!Number.isSafeInteger(cents)||cents<0||!Number.isInteger(cost))throw Error('Invalid budget or credit cost');const end=new Date(val('earnEnd')+'T23:59:59+02:00').toISOString();const id=await rpc('tenotemo_admin_campaign',{p_company_id:val('earnCompanyId'),p_post_id:val('earnPostId'),p_title:val('earnTitle'),p_description:val('earnDescription'),p_budget_cents:cents,p_credit_cost:cost,p_ends_at:end});note('Campaign created: '+id);await refresh()}catch(e){note(e.message)}};
$('earnApproveReward').onclick=async()=>{if(!confirm('Confirm referral/customer evidence was independently reviewed and the company reward budget is funded?'))return;try{const cents=Math.round(Number(val('earnRewardAmount'))*100);if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Invalid amount');await rpc('tenotemo_admin_reward',{p_enrolment_id:val('earnEnrolment'),p_amount_cents:cents,p_reason:val('earnReason')});note('Reward approved; pay by verified manual EFT.');await refresh()}catch(e){note(e.message)}};$('earnClose').onclick=()=>panel.classList.remove('open');
$('earnClaim').onclick=async()=>{const b=$('earnClaim');b.disabled=true;try{const d=$('earnClaimDate').value;const rows=await rpc('tenotemo_claim_memory_day',{p_date:d});const r=rows[0];note(`Claimed ${r.completion_credits} daily-challenge credits + ${r.top50_credits} Top 50 credits!`);await refresh();note(`Claimed ${r.completion_credits} challenge + ${r.top50_credits} ranking credits.`)}catch(e){note(e.message)}finally{b.disabled=false}};
$('earnClaimDate').value=day(-1);$('earnClaimDate').max=day(-1);
// Spotlight Share & Earn button only appears when its post is tied to an active campaign.
window.tenotemoEarnShareSpotlight=async postId=>{if(!tUser)return note('Sign in first.');panel.classList.add('open');await refresh();const d=await rpc('tenotemo_earn_home');const c=(d.campaigns||[]).find(x=>x.spotlight_post_id===postId);if(c)note('Find the company campaign below to unlock and share it.')};
})();
