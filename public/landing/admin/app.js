const state={pin:sessionStorage.getItem('landingAdminPin')||'',defaults:null,stored:[],global:{},selected:null,publishing:false,mediaConfigured:null,leadNotificationEmails:[],globalBaseline:'',pageBaseline:'',pageOfferDraft:null};
const $=id=>document.getElementById(id);

function api(path,opts={}){
  return fetch(path,{...opts,headers:{'content-type':'application/json','x-table-code':state.pin,...(opts.headers||{})},cache:'no-store'})
    .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.message||d.error||'Request failed'),{status:r.status,data:d});return d});
}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showStatus(el,msg,bad=false,busy=false){
  el.textContent=msg;el.classList.toggle('error',bad);el.classList.toggle('busy',busy);
  if(el=== $('globalStatus')||el=== $('pageStatus'))$('dockStatus').textContent=msg||'';
  if(msg&&!busy)setTimeout(()=>{if(el.textContent===msg)el.textContent='';if($('dockStatus').textContent===msg)$('dockStatus').textContent=''},5000);
}
function defaultsGlobal(){return state.defaults?.global||{}}
function effectiveGlobal(){return {...defaultsGlobal(),...state.global}}

function globalFormValue(){
  return {
    qualifiedZipCodes:$('globalZips').value.split(',').map(v=>v.trim()).filter(Boolean),
    leadNotificationEmails:state.leadNotificationEmails.slice(),
    defaultVideoUrl:$('globalVideo').value.trim(),
    trialType:$('globalTrialType').value.trim(),
    trialCost:$('globalTrialCost').value.trim(),
    trialDuration:$('globalTrialDuration').value.trim(),
    regularPrice:$('globalRegularPrice').value.trim(),
    firstClassBookingText:$('globalFirstClassBookingText').value.trim(),
    mindbodyUrl:$('globalMindbodyUrl').value.trim()
  };
}
function stableValue(value){return JSON.stringify(value)}
function currentPageValue(){return state.selected?formPage():null}
function updateSaveStates(){
  const globalDirty=state.globalBaseline!==''&&stableValue(globalFormValue())!==state.globalBaseline;
  $('saveGlobalBtn').disabled=!globalDirty;

  const pageValue=currentPageValue();
  const isNew=!!(state.selected&&!state.selected.isDefault&&!state.selected.isStored);
  const pageDirty=!!pageValue&&(isNew||state.pageBaseline===''||stableValue(pageValue)!==state.pageBaseline);
  $('savePageBtn').disabled=state.publishing||!pageDirty;
}
function setGlobalBaseline(){state.globalBaseline=stableValue(globalFormValue());updateSaveStates();}
function setPageBaseline(){
  const value=currentPageValue();
  state.pageBaseline=value?stableValue(value):'';
  updateSaveStates();
}

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
    fetch('/api/landing/media-status',{cache:'no-store'}).then(r=>r.json()).catch(()=>({configured:false}))
  ]);
  state.defaults=defaults;state.stored=stored.pages||[];state.global=global.global||{};state.mediaConfigured=Boolean(media.configured);
  populateGlobal();
  setGlobalBaseline();
  if(!state.mediaConfigured){
    $('uploadGlobalVideoBtn').disabled=true;$('uploadPageVideoBtn').disabled=true;
    showStatus($('globalVideoStatus'),'R2 video storage: NOT CONNECTED. Add the LANDING_MEDIA binding, then redeploy.',true);
    showStatus($('pageVideoStatus'),'R2 video storage: NOT CONNECTED. URL/path video changes still work.',true);
  }else{
    $('uploadGlobalVideoBtn').disabled=false;$('uploadPageVideoBtn').disabled=false;
    showStatus($('globalVideoStatus'),'R2 video storage: CONNECTED.');
  }
  $('loginView').classList.add('hidden');$('adminView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
  renderList();
  if(!state.selected)selectPage(mergePages()[0]);
  showAdminTab('global');
}
function populateGlobal(){
  const g=effectiveGlobal();
  $('globalZips').value=(g.qualifiedZipCodes||[]).join(', ');
  state.leadNotificationEmails=Array.isArray(g.leadNotificationEmails)?g.leadNotificationEmails.slice():['pompanobeach@f45training.com'];
  renderLeadEmailList();
  $('globalVideo').value=g.defaultVideoUrl||'/trial-video.mp4';
  $('globalTrialType').value=g.trialType||'3 Classes';
  $('globalTrialCost').value=g.trialCost||'$30';
  $('globalTrialDuration').value=g.trialDuration||'7 days';
  $('globalRegularPrice').value=g.regularPrice||g.trialCost||'$30';
  $('globalFirstClassBookingText').value=g.firstClassBookingText||'Your first class must be booked within 14 days of purchasing the trial.';
  $('globalMindbodyUrl').value=g.mindbodyUrl||'';
}
function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
}
function renderLeadEmailList(){
  const list=$('leadEmailList');
  if(!list)return;
  list.innerHTML='';
  if(!state.leadNotificationEmails.length){
    const empty=document.createElement('div');
    empty.className='email-empty';
    empty.textContent='No notification emails configured. Forms will still unlock, but no lead email will be sent.';
    list.appendChild(empty);
    return;
  }
  state.leadNotificationEmails.forEach((email,index)=>{
    const row=document.createElement('div');
    row.className='email-recipient-item';
    const main=document.createElement('div');
    main.className='email-recipient-main';
    const strong=document.createElement('strong');
    strong.textContent=email;
    main.appendChild(strong);
    if(index===0){
      const badge=document.createElement('span');
      badge.className='email-primary-badge';
      badge.textContent='Primary';
      main.appendChild(badge);
    }
    const remove=document.createElement('button');
    remove.type='button';
    remove.className='email-remove-btn';
    remove.textContent='Remove';
    remove.onclick=()=>{state.leadNotificationEmails.splice(index,1);renderLeadEmailList();updateSaveStates();};
    row.appendChild(main);
    row.appendChild(remove);
    list.appendChild(row);
  });
}
function addLeadEmail(){
  const input=$('leadEmailInput');
  const email=String(input.value||'').trim().toLowerCase();
  if(!validEmail(email)){alert('Enter a valid email address.');input.focus();return;}
  if(state.leadNotificationEmails.includes(email)){alert('That email address is already in the list.');input.focus();return;}
  state.leadNotificationEmails.push(email);
  input.value='';
  renderLeadEmailList();
  updateSaveStates();
  input.focus();
}

function readOfferFields(){
  return {
    trialType:$('trialType').value.trim(),
    trialCost:$('trialCost').value.trim(),
    trialDuration:$('trialDuration').value.trim(),
    regularPrice:$('regularPrice').value.trim(),
    firstClassBookingText:$('firstClassBookingText').value.trim(),
    mindbodyUrl:$('mindbodyUrl').value.trim()
  };
}
function writeOfferFields(values={}){
  $('trialType').value=values.trialType||'';
  $('trialCost').value=values.trialCost||'';
  $('trialDuration').value=values.trialDuration||'';
  $('regularPrice').value=values.regularPrice||'';
  $('firstClassBookingText').value=values.firstClassBookingText||'';
  $('mindbodyUrl').value=values.mindbodyUrl||'';
}
function globalOfferFields(){
  const g=effectiveGlobal();
  return {
    trialType:g.trialType||'3 Classes',
    trialCost:g.trialCost||'$30',
    trialDuration:g.trialDuration||'7 days',
    regularPrice:g.regularPrice||'',
    firstClassBookingText:g.firstClassBookingText||'',
    mindbodyUrl:g.mindbodyUrl||''
  };
}

function updateViewportVars(){
  const vv=window.visualViewport;
  const top=vv?Math.max(0,vv.offsetTop):0;
  const bottom=vv?Math.max(0,window.innerHeight-(vv.height+vv.offsetTop)):0;
  document.documentElement.style.setProperty('--vv-top',top+'px');
  document.documentElement.style.setProperty('--vv-bottom',bottom+'px');
}
function isMobileEditor(){return window.matchMedia('(max-width:620px)').matches;}
function openMobileEditor(){
  if(!isMobileEditor())return;
  updateViewportVars();
  document.body.classList.add('mobile-editor-open');
  $('editorBackdrop').classList.remove('hidden');
  setTimeout(()=>{$('editorTitle').focus?.();},0);
}
function closeMobileEditor(){
  document.body.classList.remove('mobile-editor-open');
  $('editorBackdrop').classList.add('hidden');
}

function renderList(){
  const list=$('pageList');list.innerHTML='';
  for(const p of mergePages()){
    const b=document.createElement('button');b.type='button';b.className='page-item'+(!isMobileEditor()&&state.selected?.slug===p.slug?' active':'');
    b.innerHTML='<strong>'+escapeHtml(p.slug==='root'?'Main / Root':p.partner||p.slug)+'</strong><span>'+escapeHtml(urlFor(p))+'</span>';
    b.onclick=()=>{selectPage(p);openMobileEditor();};list.appendChild(b);
  }
}
function selectPage(p){
  if(!p)return;
  state.selected={...p};
  $('emptyEditor').classList.add('hidden');$('pageForm').classList.remove('hidden');
  const showBadge=p.slug==='root';
  $('editorBadge').classList.toggle('hidden',!showBadge);
  if(showBadge)$('editorBadge').textContent='MAIN PAGE';
  $('editorTitle').textContent=p.slug==='root'?'Main / Root Page':(p.partner||p.slug||'New Partner');
  const u=urlFor(p);$('editorUrl').textContent=u;
  if(u){$('openPageLink').href=u;$('openPageLink').classList.remove('hidden')}else{$('openPageLink').classList.add('hidden')}

  const g=effectiveGlobal();
  $('pagePartner').value=p.partner||'';
  $('pageSlug').value=p.slug||'';
  const inherit=p.offerOverrideEnabled!==true;
  $('inheritGlobalOffer').checked=inherit;
  state.pageOfferDraft={
    trialType:p.trialType||g.trialType||'3 Classes',
    trialCost:p.trialCost||g.trialCost||'$30',
    trialDuration:p.trialDuration||g.trialDuration||'7 days',
    regularPrice:p.regularPrice||g.regularPrice||'',
    firstClassBookingText:p.firstClassBookingText||g.firstClassBookingText||'',
    mindbodyUrl:p.mindbodyUrl||g.mindbodyUrl||''
  };
  writeOfferFields(inherit?globalOfferFields():state.pageOfferDraft);
  $('promoCode').value=p.promoCode||'';
  $('percentageSavings').value=p.percentageSavings||'';
  $('videoUrl').value=p.videoUrl||'';
  $('pageEnabled').checked=p.enabled!==false;

  const locked=p.isDefault||p.slug==='root';
  $('pageSlug').disabled=locked;$('pagePartner').disabled=p.slug==='root';
  $('slugHelp').textContent=locked?'URL slug is fixed for existing pages.':'New page URL will use /landing/'+(p.slug||'your-slug')+'/';
  $('resetPageBtn').textContent=p.isDefault||p.slug==='root'?'Reset Override':'Delete Page';
  syncOfferInheritanceFields();
  renderList();
  if(!$('pagesPanel').classList.contains('hidden')){
    $('dockContext').textContent=p.slug==='root'?'Main / Root Page':(p.partner||p.slug||'Landing Page');
    $('openPageLink').classList.toggle('hidden',!u);
    $('savePageBtn').classList.remove('hidden');
  }
  setPageBaseline();
}
function formPage(){
  const base=state.selected||{};
  const slug=base.isDefault||base.slug==='root'?base.slug:cleanSlug($('pageSlug').value);
  const inherit=$('inheritGlobalOffer').checked;
  const offer=inherit?(state.pageOfferDraft||globalOfferFields()):readOfferFields();
  return {slug,pageKind:slug==='root'?'root':'partner',partner:slug==='root'?'Main Website':$('pagePartner').value.trim(),trialType:offer.trialType,trialCost:offer.trialCost,trialDuration:offer.trialDuration,promoCode:$('promoCode').value.trim(),regularPrice:offer.regularPrice,percentageSavings:$('percentageSavings').value.trim(),firstClassBookingText:offer.firstClassBookingText,videoUrl:$('videoUrl').value.trim(),mindbodyUrl:offer.mindbodyUrl,offerOverrideEnabled:!inherit,enabled:$('pageEnabled').checked};
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
    targetInput.value=d.url;showStatus(statusEl,'Video uploaded and selected.');updateSaveStates();
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

function syncOfferInheritanceFields(){
  const inherit=$('inheritGlobalOffer').checked;
  for(const id of ['trialType','trialCost','trialDuration','regularPrice','firstClassBookingText','mindbodyUrl'])$(id).disabled=inherit;
}
$('inheritGlobalOffer').addEventListener('change',()=>{
  const inherit=$('inheritGlobalOffer').checked;
  if(inherit){
    state.pageOfferDraft=readOfferFields();
    writeOfferFields(globalOfferFields());
  }else{
    writeOfferFields(state.pageOfferDraft||globalOfferFields());
  }
  syncOfferInheritanceFields();
  updateSaveStates();
});

function showAdminTab(tab){
  const globalMode=tab==='global';
  $('globalPanel').classList.toggle('hidden',!globalMode);
  $('pagesPanel').classList.toggle('hidden',globalMode);
  $('globalTabBtn').classList.toggle('active',globalMode);
  $('pagesTabBtn').classList.toggle('active',!globalMode);
  $('saveGlobalBtn').classList.toggle('hidden',!globalMode);
  $('savePageBtn').classList.toggle('hidden',globalMode||!state.selected);
  $('openPageLink').classList.toggle('hidden',globalMode||!state.selected||!urlFor(state.selected));
  $('dockContext').textContent=globalMode?'Global Settings':(state.selected?(state.selected.slug==='root'?'Main / Root Page':state.selected.partner||state.selected.slug):'Landing Pages');
  $('dockStatus').textContent='';
  updateSaveStates();
}
$('globalTabBtn').addEventListener('click',()=>{closeMobileEditor();showAdminTab('global');});
$('pagesTabBtn').addEventListener('click',()=>{closeMobileEditor();showAdminTab('pages');});

$('editorBackdrop').addEventListener('click',closeMobileEditor);
$('editorBackBtn').addEventListener('click',closeMobileEditor);
window.addEventListener('resize',()=>{updateViewportVars();if(!isMobileEditor())closeMobileEditor();});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',updateViewportVars);
  window.visualViewport.addEventListener('scroll',updateViewportVars);
}
updateViewportVars();

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';try{await login($('pin').value.trim())}catch(err){$('loginError').textContent=err.message}});
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('landingAdminPin');location.reload()};
$('addLeadEmailBtn').onclick=addLeadEmail;
$('leadEmailInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addLeadEmail();}});

for(const id of ['globalZips','globalVideo','globalTrialType','globalTrialCost','globalTrialDuration','globalRegularPrice','globalFirstClassBookingText','globalMindbodyUrl']){
  $(id).addEventListener('input',updateSaveStates);
  $(id).addEventListener('change',updateSaveStates);
}
$('pageForm').addEventListener('input',updateSaveStates);
$('pageForm').addEventListener('change',updateSaveStates);

$('uploadGlobalVideoBtn').onclick=async()=>{try{await uploadVideo($('globalVideoFile').files[0],$('globalVideo'),$('globalVideoStatus'),$('uploadGlobalVideoBtn'))}catch(e){showStatus($('globalVideoStatus'),e.message,true)}};
$('uploadPageVideoBtn').onclick=async()=>{try{await uploadVideo($('pageVideoFile').files[0],$('videoUrl'),$('pageVideoStatus'),$('uploadPageVideoBtn'))}catch(e){showStatus($('pageVideoStatus'),e.message,true)}};

$('saveGlobalBtn').onclick=async()=>{if($('saveGlobalBtn').disabled)return;
  const body={
    qualifiedZipCodes:$('globalZips').value,
    leadNotificationEmails:state.leadNotificationEmails.slice(),
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
  try{
    const r=await api('/api/landing/admin/global',{method:'POST',body:JSON.stringify(body)});
    state.global=r.global||{};
    populateGlobal();
    setGlobalBaseline();
    if(state.selected&&state.selected.offerOverrideEnabled!==true){
      const refreshed=mergePages().find(x=>x.slug===state.selected.slug)||state.selected;
      selectPage(refreshed);
    }
    showStatus($('globalStatus'),'Global settings saved.');
    $('dockStatus').textContent='Global settings saved and synced to pages using Global.';
  }
  catch(e){showStatus($('globalStatus'),e.message,true)}
  finally{btn.textContent='Save Global Settings';updateSaveStates()}
};

$('newPageBtn').onclick=()=>{
  showAdminTab('pages');
  const g=effectiveGlobal();
  selectPage({slug:'',partner:'',pageKind:'partner',trialType:g.trialType||'3 Classes',trialCost:g.trialCost||'$30',trialDuration:g.trialDuration||'7 days',firstClassBookingText:g.firstClassBookingText||'',regularPrice:g.regularPrice||g.trialCost||'$30',percentageSavings:'',promoCode:'',videoUrl:'',mindbodyUrl:g.mindbodyUrl||'',offerOverrideEnabled:false,enabled:true,isDefault:false,isStored:false});
  openMobileEditor();
  $('pageSlug').focus();
};

$('pageForm').addEventListener('submit',async e=>{
  e.preventDefault();if(state.publishing||$('savePageBtn').disabled)return;
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
    $('dockContext').textContent=saved.partner||saved.slug;
  }catch(err){showStatus($('pageStatus'),err.message,true)}
  finally{state.publishing=false;btn.textContent='Save Page';updateSaveStates()}
});

function openDeleteDialog(){
  return new Promise(resolve=>{
    const dialog=$('deleteDialog');
    const input=$('deleteConfirmInput');
    const confirmBtn=$('confirmDeleteBtn');
    const cancelBtn=$('cancelDeleteBtn');
    let settled=false;

    function finish(ok){
      if(settled)return;
      settled=true;
      dialog.classList.add('hidden');
      input.value='';
      confirmBtn.disabled=true;
      input.removeEventListener('input',onInput);
      input.removeEventListener('keydown',onKeydown);
      confirmBtn.removeEventListener('click',onConfirm);
      cancelBtn.removeEventListener('click',onCancel);
      dialog.removeEventListener('click',onBackdrop);
      resolve(ok);
    }
    function onInput(){
      const upper=input.value.toUpperCase();
      if(input.value!==upper)input.value=upper;
      confirmBtn.disabled=upper!=='DELETE';
    }
    function onKeydown(e){
      if(e.key==='Escape'){e.preventDefault();finish(false);}
      if(e.key==='Enter'&&input.value==='DELETE'){e.preventDefault();finish(true);}
    }
    function onConfirm(){finish(input.value==='DELETE');}
    function onCancel(){finish(false);}
    function onBackdrop(e){if(e.target===dialog)finish(false);}

    input.value='';
    confirmBtn.disabled=true;
    dialog.classList.remove('hidden');
    input.addEventListener('input',onInput);
    input.addEventListener('keydown',onKeydown);
    confirmBtn.addEventListener('click',onConfirm);
    cancelBtn.addEventListener('click',onCancel);
    dialog.addEventListener('click',onBackdrop);
    requestAnimationFrame(()=>input.focus());
  });
}

$('resetPageBtn').onclick=async()=>{
  if(!state.selected)return;
  const name=state.selected.partner||state.selected.slug;
  const isReset=state.selected.isDefault||state.selected.slug==='root';
  if(isReset){
    if(!confirm('Reset this page back to its repository/global defaults?'))return;
  }else{
    const confirmed=await openDeleteDialog();
    if(!confirmed)return;
  }
  try{
    const deletedSlug=state.selected.slug;
    await api('/api/landing/admin/pages',{method:'POST',body:JSON.stringify({action:'delete',slug:deletedSlug})});
    state.stored=state.stored.filter(x=>x.slug!==deletedSlug);

    if(isReset){
      const fallback=mergePages().find(x=>x.slug===deletedSlug)||mergePages()[0];
      state.selected=null;
      renderList();
      selectPage(fallback);
      showStatus($('pageStatus'),name+' reset.');
    }else{
      state.selected=null;
      state.pageOfferDraft=null;
      renderList();
      closeMobileEditor();
      showAdminTab('pages');
      $('pageForm').classList.add('hidden');
      $('emptyEditor').classList.remove('hidden');
      $('editorBadge').classList.add('hidden');
      $('editorTitle').textContent='Select a page';
      $('editorUrl').textContent='';
      $('openPageLink').classList.add('hidden');
      $('savePageBtn').classList.add('hidden');
      $('dockContext').textContent='Landing Pages';
      $('dockStatus').textContent=name+' deleted.';
    }
  }catch(err){showStatus($('pageStatus'),err.message,true)}
};

if(state.pin){login(state.pin).catch(()=>{sessionStorage.removeItem('landingAdminPin');state.pin='';document.documentElement.classList.remove('admin-handoff');$('loginView').classList.remove('hidden')})}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/landing/admin/sw.js',{scope:'/landing/admin/'}).catch(()=>{});
  });
}


function preventAdminZoomGestures(){
  const prevent=e=>e.preventDefault();
  document.addEventListener('gesturestart',prevent,{passive:false});
  document.addEventListener('gesturechange',prevent,{passive:false});
  document.addEventListener('gestureend',prevent,{passive:false});
}
preventAdminZoomGestures();
