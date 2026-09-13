(()=>{
const $=id=>document.getElementById(id);
const f=$('leadForm'),b=$('submitBtn'),ok=$('success'),err=$('error');
const u=new URL(location.href),kit=u.searchParams.get('kit')||'',event=u.searchParams.get('event')||'';
$('again').onclick=()=>location.reload();
f.addEventListener('submit',async e=>{
  e.preventDefault();err.classList.remove('show');
  if(!f.reportValidity())return;
  const z=$('zp').value.trim();
  if(!/^\d{5}$/.test(z)){err.textContent='Please enter a valid 5-digit ZIP code.';err.classList.add('show');return}
  b.disabled=true;b.textContent='Saving...';
  const p={first_name:$('fn').value.trim(),last_name:$('ln').value.trim(),email:$('em').value.trim(),phone:$('ph').value.trim(),zip:z,website:$('web').value,contact_consent:$('cc').checked,terms_accepted:$('tc').checked,marketing_opt_in:$('mk').checked,kit,event};
  try{
    const r=await fetch('/api/leads/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}),j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw new Error(j.message||'Could not save your information.');
    f.style.display='none';ok.classList.add('show');
  }catch(x){err.textContent=x.message||'Could not save your information.';err.classList.add('show')}
  finally{b.disabled=false;b.textContent='Submit'}
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/tableleads/sw.js').catch(()=>{});
})();