const state={pin:sessionStorage.getItem('landingAdminPin')||'',defaults:null,stored:[],global:{},selected:null,publishing:false,mediaConfigured:null};
const $=id=>document.getElementById(id);

function api(path,opts={}){
  return fetch(path,{...opts,headers:{'content-type':'application/json','x-table-code':state.pin,...(opts.headers||{})},cache:'no-store'})
    .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.message||d.error||'Request failed'),{status:r.status,data:d});return d});
}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showStatus(el,msg,bad=false,busy=false){el.textContent=msg;el.classList.toggle('error',bad);el.classList.toggle('busy',busy);if(msg&&!busy)setTimeout(()=>{if(el.textContent===msg)el.textContent=''},5000)}
function defaultsGlobal(){return state.defaults?.global||{}}
function effectiveGlobal(){return {...defaultsGlobal(),...state.global}}

function mergePages(){
  const by=new Map();
  for(const p of state.defaults?.pages||[])by.set(p.slug,{...p,isDefault:true});
  for(const p of state.stored)by.set(p.slug,{...(by.get(p.slug)||{}),...p,isStored:true});
  return [...by.values()].filter(p=>p.slug!=='social-trial');
}
function urlFor(p){
  if(!p)return'';
  if(p.slug==='root')return 'https://f45pompano.com/';
  return p.isDefault?'https://f45pompano.com/'+p.slug+'/':'https://f45pompano.com/landing/'+p.slug+'/';
}

async function login(code){
  const r=await fetch('/api/leads/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.role!=='admin')throw new Error(d.message||'Super Admin PIN required.');
  state.pin=code;sessionStorage.setItem('landingAdminPin',code);await loadAdmin();
}
async function loadAdmin(){
  const [defaults,stored,global,media]=await Promise.all([
    fetch('/landing-defaults.json',{cache:'no-store'}).then(r=>r.json()),
    api('/api/landing/admin/pages'),
    api('/api/landing/admin/global'),
    api('/api/landing/admin/media').catch(()=>({configured:false}))
  ]);
  state.defaults=defaults;state.stored=stored.pages||[];state.global=global.global||{};state.mediaConfigured=Boolean(media.configured);
  populateGlobal();
  if(!state.mediaConfigured){
    $('uploadGlobalVideoBtn').disabled=true;$('uploadPageVideoBtn').disabled=true;
    showStatus($('globalVideoStatus'),'Video file uploads need the Cloudflare LANDING_MEDIA (R2) binding. URL/path video changes still work.',true);
    showStatus($('pageVideoStatus'),'Video file uploads need the Cloudflare LANDING_MEDIA (R2) binding. URL/path video changes still work.',true);
  }
  $('loginView').classList.add('hidden');$('adminView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
  renderList();
  if(!state.selected)selectPage(mergePages()[0]);
}
function populateGlobal(){
  const g=effectiveGlobal();
  $('globalZips').value=(g.qualifiedZipCodes||[]).join(', ');
  $('globalVideo').value=g.defaultVideoUrl||'/trial-video.mp4';
  $('globalTrialType').value=g.trialType||'3 Classes';
  $('globalTrialCost').value=g.trialCost||'$30';
  $('globalTrialDuration').value=g.trialDuration||'7 days';
  $('globalRegularPrice').value=g.regularPrice||g.trialCost||'$30';
  $('globalFirstClassBookingText').value=g.firstClassBookingText||'Your first class must be booked within 14 days of purchasing the trial.';
  $('globalMindbodyUrl').value=g.mindbodyUrl||'';
}
function renderList(){
  const list=$('pageList');list.innerHTML='';
  for(const p of mergePages()){
    const b=document.createElement('button');b.type='button';b.className='page-item'+(state.selected?.slug===p.slug?' active':'');
    b.innerHTML='<strong>'+escapeHtml(p.slug==='root'?'Main / Root':p.partner||p.slug)+'</strong><span>'+escapeHtml(urlFor(p))+'</span>';
    b.onclick=()=>selectPage(p);list.appendChild(b);
  }
}
function selectPage(p){
  if(!p)return;
  state.selected={...p};
  $('emptyEditor').classList.add('hidden');$('pageForm').classList.remove('hidden');
  $('editorBadge').textContent=p.slug==='root'?'MAIN PAGE':(p.isDefault?'PARTNER PAGE':'NEW PARTNER');
  $('editorTitle').textContent=p.slug==='root'?'Main / Root Page':(p.partner||p.slug||'New Partner');
  const u=urlFor(p);$('editorUrl').textContent=u;
  if(u){$('openPageLink').href=u;$('openPageLink').classList.remove('hidden')}else{$('openPageLink').classList.add('hidden')}

  const g=effectiveGlobal();
  $('pagePartner').value=p.partner||'';
  $('pageSlug').value=p.slug||'';
  $('trialType').value=p.trialType||g.trialType||'3 Classes';
  $('trialCost').value=p.trialCost||g.trialCost||'$30';
  $('trialDuration').value=p.trialDuration||g.trialDuration||'7 days';
  $('promoCode').value=p.promoCode||'';
  $('regularPrice').value=p.regularPrice||g.regularPrice||'';
  $('percentageSavings').value=p.percentageSavings||'';
  $('firstClassBookingText').value=p.firstClassBookingText||g.firstClassBookingText||'';
  $('videoUrl').value=p.videoUrl||'';
  $('mindbodyUrl').value=p.mindbodyUrl||'';
  $('pageEnabled').checked=p.enabled!==false;

  const locked=p.isDefault||p.slug==='root';
  $('pageSlug').disabled=locked;$('pagePartner').disabled=p.slug==='root';
  $('slugHelp').textContent=locked?'URL slug is fixed for existing pages.':'New page URL will use /landing/'+(p.slug||'your-slug')+'/';
  $('resetPageBtn').textContent=p.isDefault||p.slug==='root'?'Reset Override':'Delete Page';
  renderList();
}
function formPage(){
  const base=state.selected||{};
  const slug=base.isDefault||base.slug==='root'?base.slug:cleanSlug($('pageSlug').value);
  return {slug,pageKind:slug==='root'?'root':'partner',partner:slug==='root'?'Main Website':$('pagePartner').value.trim(),trialType:$('trialType').value.trim(),trialCost:$('trialCost').value.trim(),trialDuration:$('trialDuration').value.trim(),promoCode:$('promoCode').value.trim(),regularPrice:$('regularPrice').value.trim(),percentageSavings:$('percentageSavings').value.trim(),firstClassBookingText:$('firstClassBookingText').value.trim(),videoUrl:$('videoUrl').value.trim(),mindbodyUrl:$('mindbodyUrl').value.trim(),enabled:$('pageEnabled').checked};
}

async function uploadVideo(file,targetInput,statusEl,button){
  if(!file)throw new Error('Choose a video file first.');
  if(file.size>60*1024*1024)throw new Error('Video must be 60 MB or smaller.');
  const form=new FormData();form.append('file',file);
  button.disabled=true;button.textContent='Uploading…';showStatus(statusEl,'Uploading video…',false,true);
  try{
    const r=await fetch('/api/landing/admin/media',{method:'POST',headers:{'x-table-code':state.pin},body:form});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||d.error||'Video upload failed.');
    targetInput.value=d.url;showStatus(statusEl,'Video uploaded and selected.');
    return d.url;
  }finally{button.disabled=false;button.textContent='Upload Video File'}
}
async function waitForPublished(url){
  const target=new URL(url,location.origin);target.searchParams.set('_publish_check',Date.now());
  let last=0;
  for(let i=0;i<12;i++){
    try{const r=await fetch(target.toString(),{cache:'no-store'});last=r.status;if(r.ok)return true}catch{}
    await new Promise(res=>setTimeout(res,500));
  }
  throw new Error('The settings were saved, but the page did not finish publishing. Last status: '+(last||'unavailable')+'.');
}

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await login($('pin').value.trim())}catch(err){$('loginError').textContent=err.message}});
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('landingAdminPin');location.reload()};

$('uploadGlobalVideoBtn').onclick=async()=>{try{await uploadVideo($('globalVideoFile').files[0],$('globalVideo'),$('globalVideoStatus'),$('uploadGlobalVideoBtn'))}catch(e){showStatus($('globalVideoStatus'),e.message,true)}};
$('uploadPageVideoBtn').onclick=async()=>{try{await uploadVideo($('pageVideoFile').files[0],$('videoUrl'),$('pageVideoStatus'),$('uploadPageVideoBtn'))}catch(e){showStatus($('pageVideoStatus'),e.message,true)}};

$('saveGlobalBtn').onclick=async()=>{
  const body={
    qualifiedZipCodes:$('globalZips').value,
    defaultVideoUrl:$('globalVideo').value.trim(),
    trialType:$('globalTrialType').value.trim(),
    trialCost:$('globalTrialCost').value.trim(),
    trialDuration:$('globalTrialDuration').value.trim(),
    regularPrice:$('globalRegularPrice').value.trim(),
    firstClassBookingText:$('globalFirstClassBookingText').value.trim(),
    mindbodyUrl:$('globalMindbodyUrl').value.trim()
  };
  if(!confirm('Save these Global Settings? They can affect the main landing page and partner pages that use global defaults.'))return;
  const btn=$('saveGlobalBtn');btn.disabled=true;btn.textContent='Saving…';showStatus($('globalStatus'),'Saving global settings…',false,true);
  try{const r=await api('/api/landing/admin/global',{method:'POST',body:JSON.stringify(body)});state.global=r.global||{};populateGlobal();showStatus($('globalStatus'),'Global settings saved.')}
  catch(e){showStatus($('globalStatus'),e.message,true)}
  finally{btn.disabled=false;btn.textContent='Save Global Settings'}
};

$('newPageBtn').onclick=()=>{
  const g=effectiveGlobal();
  selectPage({slug:'',partner:'',pageKind:'partner',trialType:g.trialType||'3 Classes',trialCost:g.trialCost||'$30',trialDuration:g.trialDuration||'7 days',firstClassBookingText:g.firstClassBookingText||'',regularPrice:g.regularPrice||g.trialCost||'$30',percentageSavings:'',promoCode:'',videoUrl:'',mindbodyUrl:'',enabled:true,isDefault:false,isStored:false});
  $('pageSlug').focus();
};

$('pageForm').addEventListener('submit',async e=>{
  e.preventDefault();if(state.publishing)return;
  const page=formPage();if(!page.slug){showStatus($('pageStatus'),'Enter a page slug.',true);return}if(page.slug==='social-trial'){showStatus($('pageStatus'),'social-trial cannot be edited here.',true);return}
  const isNew=!state.selected?.isDefault&&!state.selected?.isStored;
  const btn=$('savePageBtn');state.publishing=true;btn.disabled=true;btn.textContent=isNew?'Creating Page…':'Saving…';
  showStatus($('pageStatus'),isNew?'Creating and publishing the new partner page…':'Saving page settings…',false,true);
  try{
    const r=await api('/api/landing/admin/pages',{method:'POST',body:JSON.stringify({action:'save',page})});
    const saved={...r.page,isStored:true,isDefault:false};
    const testUrl=saved.slug==='root'?'/':'/landing/'+saved.slug+'/';
    if(isNew)await waitForPublished(testUrl);
    state.stored=state.stored.filter(x=>x.slug!==saved.slug);state.stored.push(saved);
    const merged=mergePages().find(x=>x.slug===saved.slug)||saved;selectPage(merged);
    showStatus($('pageStatus'),isNew?'Page created and published successfully.':'Page settings saved.');
  }catch(err){showStatus($('pageStatus'),err.message,true)}
  finally{state.publishing=false;btn.disabled=false;btn.textContent='Save Page'}
});

$('resetPageBtn').onclick=async()=>{
  if(!state.selected)return;
  const name=state.selected.partner||state.selected.slug;
  const msg=state.selected.isDefault||state.selected.slug==='root'?'Reset this page back to its repository/global defaults?':'Delete this landing page?';
  if(!confirm(msg))return;
  try{
    await api('/api/landing/admin/pages',{method:'POST',body:JSON.stringify({action:'delete',slug:state.selected.slug})});
    state.stored=state.stored.filter(x=>x.slug!==state.selected.slug);
    const fallback=mergePages().find(x=>x.slug===state.selected.slug)||mergePages()[0];
    state.selected=null;renderList();selectPage(fallback);showStatus($('pageStatus'),name+' reset.');
  }catch(err){showStatus($('pageStatus'),err.message,true)}
};

if(state.pin){login(state.pin).catch(()=>{sessionStorage.removeItem('landingAdminPin');state.pin=''})}
