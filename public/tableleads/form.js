(()=>{
const $=id=>document.getElementById(id);
const f=$('leadForm'),b=$('submitBtn'),ok=$('success'),err=$('error'),okIcon=ok.querySelector('.icon'),okTitle=ok.querySelector('h2'),okText=ok.querySelector('p');
const u=new URL(location.href),kit=u.searchParams.get('kit')||'',event=u.searchParams.get('event')||'';
$('again').onclick=()=>location.reload();
f.addEventListener('submit',async e=>{
  e.preventDefault();err.classList.remove('show');ok.classList.remove('show');
  if(!f.reportValidity())return;
  const z=$('zp').value.trim();
  if(!/^\d{5}$/.test(z)){err.textContent='Please enter a valid 5-digit ZIP code.';err.classList.add('show');return}
  b.disabled=true;b.textContent='Saving...';
  const p={first_name:$('fn').value.trim(),last_name:$('ln').value.trim(),email:$('em').value.trim(),phone:$('ph').value.trim(),zip:z,website:$('web').value,contact_consent:$('cc').checked,terms_accepted:$('tc').checked,marketing_opt_in:$('mk').checked,kit,event};
  try{
    const r=await fetch('/api/leads/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}),j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw new Error(j.message||'Could not save your information.');
    if(j.confirmation_required){okIcon.textContent='📱';okTitle.textContent='Check Your Phone';okText.textContent='We sent you a confirmation text from F45 Pompano Beach. Tap the link in that text to confirm your entry, then show the confirmed screen to the F45 team.'}
    else{okIcon.textContent='✓';okTitle.textContent="You're All Set!";okText.textContent='Thanks for connecting with F45 Training Pompano Beach.'}
    f.style.display='none';ok.classList.add('show');
  }catch(x){err.textContent=x.message||'Could not save your information.';err.classList.add('show')}
  finally{b.disabled=false;b.textContent='Submit'}
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/tableleads/sw.js').catch(()=>{});
})();