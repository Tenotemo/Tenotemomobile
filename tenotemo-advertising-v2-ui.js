/* Tenotemo Advertising V2 UI bridge — business ownership + compliance */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rpc(name,args={}){if(!window.tClient||!window.tUser)throw Error('Sign in first.');const {data,error}=await tClient.rpc(name,args);if(error)throw error;return data}
let businesses=[],selected=null;
async function loadBusinesses(){
 const box=$('earnV2Businesses')||$('earnCreditSummary'); if(!box)return;
 box.innerHTML='<p>Loading business ledgers…</p>';
 try{
  businesses=await rpc('tenotemo_admin_advertising_businesses');
  if(!businesses?.length){box.innerHTML='<p>No Advertising V2 businesses yet.</p>';return}
  box.innerHTML=businesses.map(b=>`<article class="earn-campaign" style="margin:8px 0"><strong>${esc(b.business_name)}</strong><p>${b.management_type==='admin_managed'?'Tenotemo Admin managed':'Self-service advertiser'}</p><p><strong>Granted:</strong> ${Number(b.granted_credits||0)} · <strong>Used:</strong> ${Number(b.used_credits||0)} · <strong>Available:</strong> ${Number(b.available_credits||0)}</p><p><small>${Number(b.application_count||0)} V2 application(s)</small></p><button type="button" data-v2-business="${esc(b.advertiser_business_id)}">Open business</button></article>`).join('');
  box.querySelectorAll('[data-v2-business]').forEach(btn=>btn.onclick=()=>selectBusiness(btn.dataset.v2Business));
 }catch(e){box.innerHTML='<p>V2 business ledgers unavailable: '+esc(e.message)+'</p>'}
}
function selectBusiness(id){selected=businesses.find(b=>b.advertiser_business_id===id);if(!selected)return;const pane=$('earnV2Adjustment');if(pane)pane.hidden=false;if($('earnV2SelectedBusiness'))$('earnV2SelectedBusiness').textContent=selected.business_name+' · '+Number(selected.available_credits||0)+' credits available';if($('earnV2AdjustmentAmount'))$('earnV2AdjustmentAmount').value='';if($('earnV2AdjustmentReason'))$('earnV2AdjustmentReason').value='';}
async function adjust(){
 const out=$('earnV2AdjustmentStatus'); if(!selected)return;
 const amount=Number($('earnV2AdjustmentAmount').value),reason=$('earnV2AdjustmentReason').value.trim();
 if(!Number.isInteger(amount)||amount===0){out.textContent='Enter a whole-number adjustment other than 0.';return}
 if(reason.length<8){out.textContent='Add a clear audit reason (at least 8 characters).';return}
 if(!confirm(`Record ${amount>0?'+':''}${amount} Advertising Credits for ${selected.business_name}? This creates an audit-ledger entry.`))return;
 try{await rpc('tenotemo_admin_adjust_advertising_credits',{p_advertiser_business_id:selected.advertiser_business_id,p_credit_amount:amount,p_reason:reason});out.textContent='Adjustment recorded.';await loadBusinesses();selectBusiness(selected.advertiser_business_id)}catch(e){out.textContent='Not recorded: '+e.message}
}
function applyComplianceCopy(){
 // Labels make the eligible publication surface explicit without claiming access to private viewer lists.
 document.querySelectorAll('#earnCampaigns select').forEach(sel=>{
   [...sel.options].forEach(o=>{if(o.value==='whatsapp')o.text='WhatsApp Status';if(o.value==='facebook')o.text='Facebook Story';if(o.value==='instagram')o.text='Instagram Story';if(['tiktok','x','other'].includes(o.value))o.disabled=true});
 });
}
const obs=new MutationObserver(applyComplianceCopy);const campaigns=$('earnCampaigns');if(campaigns)obs.observe(campaigns,{childList:true,subtree:true});
if($('earnCreditSummaryRefresh'))$('earnCreditSummaryRefresh').onclick=loadBusinesses;
if($('earnV2ApplyAdjustment'))$('earnV2ApplyAdjustment').onclick=adjust;
// Admin tab can load after auth; refresh V2 list when opened.
if($('earnAdminTab'))$('earnAdminTab').addEventListener('click',()=>setTimeout(loadBusinesses,0));
// Add compliance notice to player campaign area.
if(campaigns){const n=document.createElement('div');n.className='earn-campaign';n.style.cssText='background:#fff7ed;border:2px solid #fb923c;margin-bottom:10px';n.innerHTML='<strong>Sponsored publication rules</strong><p>Cash rewards apply only to eligible sponsored Status/Story publications: WhatsApp Status, Facebook Story or Instagram Story where available. Do not use rewarded direct messages, group spam, bots, purchased/fabricated views or engagement exchanges. Keep the publication live for more than 2 hours and provide evidence of at least 21 genuine views. These thresholds make a proof eligible for admin review; they do not guarantee approval. Avoid exposing unnecessary viewer names or phone numbers in proof screenshots.</p><p><small>Clearly disclose that the publication is sponsored/promotional and follow the social platform’s own advertising and branded-content rules.</small></p>';campaigns.parentNode.insertBefore(n,campaigns)}
loadBusinesses().catch(()=>{});
})();
