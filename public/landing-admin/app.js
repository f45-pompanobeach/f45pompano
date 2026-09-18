const state={pin:sessionStorage.getItem('landingAdminPin')||'',defaults:null,stored:[],global:{},selected:null};
const $=id=>document.getElementById(id);
function api(path,opts={}){return fetch(path,{...opts,headers:{'content-type':'application/json','x-table-code':state.pin,...(opts.headers||{})},cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.message||d.error||'Request failed'),{status:r.status,data:d});return d})}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)}
function mergePages(){
  const by=new Map();
  for(const p of state.defaults.pages||[])by.set(p.slug,{...p,isDefault:true});
  for(const p of state.stored)by.set(p.slug,{...(by.get(p.slug)||{}),...p,isStored:true});
  return [...by.values()].filter(p=>p.slug!=='social-trial');
}
function urlFor(p){if(!p)return'';return p.slug==='root'?'https://f45pompano.com/':p.isDefault?'https://f45pompano.com/'+p.slug+'/':'https://f45pompano.com/landing/'+p.slug+'/';}
function showStatus(el,msg,bad=false){el.textContent=msg;el.classList.toggle('error',bad);if(msg)setTimeout(()=>{if(el.textContent===msg)el.textContent=''},4000)}
async function login(code){
  const r=await fetch('/api/leads/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.role!=='admin')throw new Error(d.message||'Super Admin PIN required.');
  state.pin=code;sessionStorage.setItem('landingAdminPin',code);
  await loadAdmin();
}
async function loadAdmin(){
  const [defaults,stored,global]=await Promise.all([
    fetch('/landing-defaults.json',{cache:'no-store'}).then(r=>r.json()),
    api('/api/landing/admin/pages'),
    api('/api/landing/admin/global')
  ]);
  state.defaults=defaults;state.stored=stored.pages||[];state.global=global.global||{};
  $('globalZips').value=(state.global.qualifiedZipCodes||defaults.global.qualifiedZipCodes||[]).join(', ');
  $('globalVideo').value=state.global.defaultVideoUrl||defaults.global.defaultVideoUrl||'/trial-video.mp4';
  $('loginView').classList.add('hidden');$('adminView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
  renderList();
  if(!state.selected)selectPage(mergePages()[0]);
}
function renderList(){
  const list=$('pageList');list.innerHTML='';
  for(const p of mergePages()){
    const b=document.createElement('button');b.type='button';b.className='page-item'+(state.selected?.slug===p.slug?' active':'');
    b.innerHTML='<strong>'+escapeHtml(p.slug==='root'?'Main / Root':p.partner||p.slug)+'</strong><span>'+escapeHtml(urlFor(p))+'</span>';
    b.onclick=()=>selectPage(p);list.appendChild(b);
  }
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selectPage(p){
  state.selected={...p};
  $('emptyEditor').classList.add('hidden');$('pageForm').classList.remove('hidden');
  $('editorBadge').textContent=p.slug==='root'?'MAIN PAGE':(p.isDefault?'PARTNER PAGE':'NEW PARTNER');
  $('editorTitle').textContent=p.slug==='root'?'Main / Root Page':(p.partner||p.slug);
  $('editorUrl').textContent=urlFor(p);$('openPageLink').href=urlFor(p);$('openPageLink').classList.remove('hidden');
  $('pagePartner').value=p.partner||'';$('pageSlug').value=p.slug||'';$('trialType').value=p.trialType||'';$('trialCost').value=p.trialCost||'';
  $('trialDuration').value=p.trialDuration||'';$('promoCode').value=p.promoCode||'';$('regularPrice').value=p.regularPrice||'';$('percentageSavings').value=p.percentageSavings||'';
  $('firstClassBookingText').value=p.firstClassBookingText||'';$('videoUrl').value=p.videoUrl||'';$('mindbodyUrl').value=p.mindbodyUrl||'';$('pageEnabled').checked=p.enabled!==false;
  const locked=p.isDefault||p.slug==='root';$('pageSlug').disabled=locked;$('pagePartner').disabled=p.slug==='root';
  $('slugHelp').textContent=locked?'URL slug is fixed for existing pages.':'New page URL will use /landing/'+(p.slug||'your-slug')+'/';
  $('resetPageBtn').textContent=p.isDefault||p.slug==='root'?'Reset Override':'Delete Page';
  renderList();
}
function formPage(){
  const base=state.selected||{};
  const slug=base.isDefault||base.slug==='root'?base.slug:cleanSlug($('pageSlug').value);
  return {slug,pageKind:slug==='root'?'root':'partner',partner:slug==='root'?'Main Website':$('pagePartner').value.trim(),trialType:$('trialType').value.trim(),trialCost:$('trialCost').value.trim(),trialDuration:$('trialDuration').value.trim(),promoCode:$('promoCode').value.trim(),regularPrice:$('regularPrice').value.trim(),percentageSavings:$('percentageSavings').value.trim(),firstClassBookingText:$('firstClassBookingText').value.trim(),videoUrl:$('videoUrl').value.trim(),mindbodyUrl:$('mindbodyUrl').value.trim(),enabled:$('pageEnabled').checked};
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await login($('pin').value.trim())}catch(err){$('loginError').textContent=err.message}});
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('landingAdminPin');location.reload()};
$('saveGlobalBtn').onclick=async()=>{try{const body={qualifiedZipCodes:$('globalZips').value,defaultVideoUrl:$('globalVideo').value.trim()};const r=await api('/api/landing/admin/global',{method:'POST',body:JSON.stringify(body)});state.global=r.global||{};showStatus($('globalStatus'),'Global settings saved.')}catch(e){showStatus($('globalStatus'),e.message,true)}};
$('newPageBtn').onclick=()=>selectPage({slug:'',partner:'',pageKind:'partner',trialType:'3 Classes',trialCost:'$30',trialDuration:'7 days',firstClassBookingText:'Your first class must be booked within 14 days of purchasing the trial.',regularPrice:'$30',percentageSavings:'',promoCode:'',videoUrl:'',mindbodyUrl:'',enabled:true,isDefault:false,isStored:false});
$('pageForm').addEventListener('submit',async e=>{e.preventDefault();try{const page=formPage();if(!page.slug)throw new Error('Enter a page slug.');if(page.slug==='social-trial')throw new Error('social-trial is intentionally excluded.');const r=await api('/api/landing/admin/pages',{method:'POST',body:JSON.stringify({action:'save',page})});state.stored=state.stored.filter(x=>x.slug!==r.page.slug);state.stored.push(r.page);const merged=mergePages().find(x=>x.slug===r.page.slug)||r.page;selectPage(merged);showStatus($('pageStatus'),'Saved. The page will use these settings on the next load.')}catch(err){showStatus($('pageStatus'),err.message,true)}});
$('resetPageBtn').onclick=async()=>{if(!state.selected)return;const name=state.selected.partner||state.selected.slug;const msg=state.selected.isDefault||state.selected.slug==='root'?'Reset this page back to its repository defaults?':'Delete this landing page?';if(!confirm(msg))return;try{await api('/api/landing/admin/pages',{method:'POST',body:JSON.stringify({action:'delete',slug:state.selected.slug})});state.stored=state.stored.filter(x=>x.slug!==state.selected.slug);const fallback=mergePages().find(x=>x.slug===state.selected.slug)||mergePages()[0];state.selected=null;renderList();selectPage(fallback);showStatus($('pageStatus'),name+' reset.')}catch(err){showStatus($('pageStatus'),err.message,true)}};
if(state.pin){login(state.pin).catch(()=>{sessionStorage.removeItem('landingAdminPin');state.pin='';})}
