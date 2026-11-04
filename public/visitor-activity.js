/* Universal activity trail for website, partner and direct-checkout pages.
   Unsubmitted personal contact fields are NEVER sent unless the visitor opts
   in to the clearly disclosed optional Save My Progress control. */
(function(){
 'use strict';
 try{
  var parts=location.pathname.split('/').filter(Boolean);
  var page=parts[0]==='landing'?(parts[1]||'landing'):(parts[0]||'root');
  if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(page))return;
  function id(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')}
  var session='';
  try{session=sessionStorage.getItem('f45_page_tracking_session')||''}catch(e){}
  if(!/^[a-f0-9]{32}$/.test(session)){session=id();try{sessionStorage.setItem('f45_page_tracking_session',session)}catch(e){}}
  var visitor='';
  try{visitor=localStorage.getItem('f45_visitor_id')||''}catch(e){}
  if(!/^[a-f0-9]{32}$/.test(visitor)){visitor=id();try{localStorage.setItem('f45_visitor_id',visitor)}catch(e){}}
  var optIn=false,queue=[],timer=0,used=new Set(),lastSent=new Map(),lastCaptured=new Map(),pendingFields=new Set(),inputTimers=new WeakMap();
  var safeFields=new Set(['first_name','last_name','email','phone','zip']);
  function fieldKey(el){
   var raw=String(el.name||el.id||'');
   var k=raw.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,35);
   // Normalize actual form names as well as historical/partner variants.
   if(k==='firstname')return 'first_name';
   if(k==='lastname')return 'last_name';
   if(['zip_code','zip_code_on_id','zipcode','zip'].includes(k))return 'zip';
   return k;
  }
  function isText(el){return el&&el.matches&&el.matches('input:not([type=hidden]):not([type=password]):not([type=checkbox]):not([type=radio]):not([type=file]),select');}
  function targetName(el){if(!el)return 'page';return (el.getAttribute('data-track-label')||el.name||el.id||el.className?.toString().split(' ')[0]||el.tagName||'element').slice(0,65);}
  function record(name,el,detail,value){
   var key=fieldKey(el||{}),now=Date.now(),signature=name+':'+key+':'+(detail||'');
   if(name==='field_edited'&&now-(lastSent.get(signature)||0)<1700)return;
   lastSent.set(signature,now);
   var entry={id:crypto.randomUUID(),at:new Date().toISOString(),event:name,field:key,target:targetName(el),detail:detail||''};
   if(safeFields.has(key)&&optIn&&typeof value==='string'){
     entry.consented=true;entry.value=value.slice(0,140);
     lastCaptured.set(key,entry.value);
   }
   queue.push(entry);
   if(queue.length>=8)send();
   else {clearTimeout(timer);timer=setTimeout(send,1050);}
  }
  function send(useBeacon){
   clearTimeout(timer);
   if(!queue.length)return;
   var events=queue.splice(0,12),body=JSON.stringify({page,session,visitor,events});
   if(useBeacon&&navigator.sendBeacon){
     try{if(navigator.sendBeacon('/api/page-tracking/activity/',new Blob([body],{type:'application/json'})))return}catch(e){}
   }
   fetch('/api/page-tracking/activity/',{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin',keepalive:true}).catch(function(){});
  }
  function snapshotContactFields(form,reason){
   if(!optIn||!form)return;
   form.querySelectorAll('input,select').forEach(function(el){
     if(!isText(el))return;
     var key=fieldKey(el);
     if(!safeFields.has(key))return;
     var value=String(el.value||'').slice(0,140);
     // Save fields entered before consent, and any edits missed by a mobile
     // input/debounce/blur event, without duplicating unchanged snapshots.
     if(value!==lastCaptured.get(key)&&(value||lastCaptured.has(key)))
       record('field_edited',el,reason,value);
   });
  }
  function askProgressConsent(form){
   if(form.querySelector('.f45-progress-choice'))return;
   var box=document.createElement('label');box.className='f45-progress-choice';
   box.style.cssText='display:flex;grid-column:1/-1;align-items:flex-start;gap:9px;padding:9px 12px;margin:0 0 12px;border:1px solid #dce2eb;border-radius:8px;background:#f8faff;color:#28354a;font:500 12px/1.45 system-ui,sans-serif;';
   var input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label','Save unfinished contact details if I leave');
   input.style.cssText='width:18px;height:18px;min-width:18px;margin:1px 0 0;accent-color:#dc1637;';
   var caption=document.createElement('span');caption.textContent='Optional: Save my unfinished contact details for 30 days so F45 Pompano Beach can recognize my return or help me finish later. Without this, only anonymous activity is recorded.';
   box.append(input,caption);form.prepend(box);
   input.addEventListener('change',function(){
     optIn=input.checked;
     record(optIn?'progress_opt_in':'progress_opt_out',input,optIn?'enabled':'disabled');
     if(optIn){
       // Explicit permission can be given after some fields are already filled.
       snapshotContactFields(form,'consent_snapshot');
       send();
     }else{
       // Do not let queued personal values leak after permission is revoked.
       queue.forEach(function(event){delete event.value;event.consented=false;});
       lastCaptured.clear();
       send();
     }
   });
  }
  function init(){
   var form=document.getElementById('partnerLeadForm');
   if(form)askProgressConsent(form);
   record('page_view',null);
   document.addEventListener('focusin',function(e){
    var el=e.target;if(!isText(el)||el.closest('.f45-progress-choice'))return;
    var key=fieldKey(el);if(!used.has(key)){used.add(key);record('field_started',el);}
   },true);
   function flushPending(){
     pendingFields.forEach(function(el){
       if(!el.isConnected)return;
       var old=inputTimers.get(el);if(old)clearTimeout(old);
       record('field_edited',el,'changed',optIn&&safeFields.has(fieldKey(el))?el.value:undefined);
     });
     pendingFields.clear();
   }
   document.addEventListener('input',function(e){
    var el=e.target;if(!isText(el)||el.closest('.f45-progress-choice'))return;
    var old=inputTimers.get(el);if(old)clearTimeout(old);
    pendingFields.add(el);
    inputTimers.set(el,setTimeout(function(){
      if(!el.isConnected)return;
      pendingFields.delete(el);
      record('field_edited',el,'changed',optIn&&safeFields.has(fieldKey(el))?el.value:undefined);
    },750));
   },true);
   document.addEventListener('focusout',function(e){
    var el=e.target;if(!isText(el)||el.closest('.f45-progress-choice'))return;
    var old=inputTimers.get(el);if(old)clearTimeout(old);pendingFields.delete(el);
    if(used.has(fieldKey(el)))record('field_left',el,el.value?'has_input':'empty',optIn&&safeFields.has(fieldKey(el))?el.value:undefined);
   },true);
   document.addEventListener('change',function(e){
    var el=e.target;
    if(el&&el.matches&&el.matches('input[type=checkbox]')&&!el.closest('.f45-progress-choice')){
      record('checkbox_changed',el,el.checked?'checked':'unchecked');
    }
   },true);
   document.addEventListener('toggle',function(e){
     if(e.target?.matches?.('details'))record('details_toggled',e.target,e.target.open?'opened':'closed');
   },true);
   document.addEventListener('invalid',function(e){
    if(e.target?.closest?.('form'))
      record('validation_blocked',e.target,'required_or_invalid');
   },true);
   document.addEventListener('submit',function(e){
    if(e.target?.matches?.('form')){
      snapshotContactFields(e.target,'submit_snapshot');
      record('form_submit_attempt',e.target);
    }
   },true);
   document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');
    if(a){
      try{var u=new URL(a.href,location.href);
        if(u.hostname==='clients.mindbodyonline.com'||u.hostname.endsWith('.mindbodyonline.com'))
          record('checkout_clicked',a);
        else if(['https:','http:'].includes(u.protocol))
          record('link_clicked',a,u.host===location.host?'internal':'external');
      }catch(ex){}
    }else{
      var b=e.target.closest&&e.target.closest('button');
      if(b&&!b.closest('.f45-progress-choice'))record('button_clicked',b);
    }
   },true);
   var success=document.querySelector('[data-activity-success],#claimSuccess,#rootClaimSuccess,.claim-success');
   if(success){
    var sent=false;
    function changed(){
      var shown=success.classList.contains('is-visible')||(!success.hidden&&getComputedStyle(success).display!=='none');
      if(shown&&!sent){sent=true;record('form_submitted',success);send();}
    }
    var observer=new MutationObserver(changed);
    observer.observe(success,{attributes:true,attributeFilter:['class','style','hidden']});
    changed();
   }
   document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'){
      flushPending();snapshotContactFields(document.getElementById('partnerLeadForm'),'exit_snapshot');
      record('page_hidden',null);send(true);
    }
   });
   window.addEventListener('pagehide',function(){
     flushPending();snapshotContactFields(document.getElementById('partnerLeadForm'),'exit_snapshot');send(true);
   });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 }catch(e){}
})();
