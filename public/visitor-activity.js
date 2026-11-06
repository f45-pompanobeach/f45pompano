/* First-party visitor activity: interaction events and limited lead form fields.
   The footer and privacy policy disclose 30-day retention of unfinished entries. */
(function trackVisibleActivity(){
 'use strict';
 try{
  // Do not generate root or partner activity from background previews or frames.
  if(window.top!==window.self)return;
  if(document.prerendering||document.visibilityState!=='visible'){
    document.addEventListener('visibilitychange',function onReveal(){
      if(document.visibilityState==='visible'&&!document.prerendering){
        document.removeEventListener('visibilitychange',onReveal);
        trackVisibleActivity();
      }
    });
    return;
  }
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
  var queue=[],timer=0,lastSent=new Map(),lastCaptured=new Map(),dirtyFields=new Set(),pendingFields=new Set(),inputTimers=new WeakMap();
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
   if(name==='field_edited'&&typeof value!=='string'&&now-(lastSent.get(signature)||0)<1700)return;
   if(name==='field_edited'&&typeof value==='string'&&lastCaptured.get(key)===value.slice(0,140))return;
   lastSent.set(signature,now);
   var entry={id:crypto.randomUUID(),at:new Date().toISOString(),event:name,field:key,target:targetName(el),detail:detail||''};
   if(safeFields.has(key)&&typeof value==='string'&&el?.closest?.('form#partnerLeadForm')){
     entry.value=value.slice(0,140);
     lastCaptured.set(key,entry.value);
   }
   queue.push(entry);
   if(queue.length>=8)send();
   else {clearTimeout(timer);timer=setTimeout(send,1050);}
  }
  function send(useBeacon){
   clearTimeout(timer);
   if(!queue.length)return;
   var events=queue.splice(0,12),body=JSON.stringify({page,session,visitor,foreground:true,events});
   if(useBeacon&&navigator.sendBeacon){
     try{if(navigator.sendBeacon('/api/page-tracking/activity/',new Blob([body],{type:'application/json'})))return}catch(e){}
   }
   fetch('/api/page-tracking/activity/',{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin',keepalive:true}).catch(function(){});
  }
  function snapshotContactFields(form,reason){
   if(!form||!form.matches?.('form#partnerLeadForm'))return;
   form.querySelectorAll('input,select').forEach(function(el){
     if(!isText(el))return;
     var key=fieldKey(el);
     if(!safeFields.has(key)||!dirtyFields.has(key))return;
     var value=String(el.value||'').slice(0,140);
     // Save edits missed by mobile input/debounce or blur events, without duplicates.
     if(value!==lastCaptured.get(key)&&(value||lastCaptured.has(key)))
       record('field_edited',el,reason,value);
   });
  }
  function init(){
   record('page_view',null);
   function flushPending(){
     pendingFields.forEach(function(el){
       if(!el.isConnected)return;
       var old=inputTimers.get(el);if(old)clearTimeout(old);
       record('field_edited',el,'changed',safeFields.has(fieldKey(el))?el.value:undefined);
     });
     pendingFields.clear();
   }
   document.addEventListener('input',function(e){
    var el=e.target;if(!isText(el))return;
    var old=inputTimers.get(el);if(old)clearTimeout(old);
    pendingFields.add(el);
    if(safeFields.has(fieldKey(el))&&el.closest?.('form#partnerLeadForm'))dirtyFields.add(fieldKey(el));
    inputTimers.set(el,setTimeout(function(){
      if(!el.isConnected)return;
      pendingFields.delete(el);
      record('field_edited',el,'changed',safeFields.has(fieldKey(el))?el.value:undefined);
    },750));
   },true);
   document.addEventListener('focusout',function(e){
    // Flush actual pending edits only; focusing or leaving is not activity.
    var el=e.target;if(!isText(el))return;
    var old=inputTimers.get(el);if(old)clearTimeout(old);
    if(pendingFields.has(el)){
      pendingFields.delete(el);
      record('field_edited',el,'changed',safeFields.has(fieldKey(el))?el.value:undefined);
    }
   },true);
   document.addEventListener('change',function(e){
    var el=e.target;
    if(el&&el.matches&&el.matches('input[type=checkbox]')){
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
        if(u.hostname==='clients.mindbodyonline.com'||u.hostname.endsWith('.mindbodyonline.com')){
          // The social-trial eligibility gate can prevent the first click.
          // Never report that blocked attempt as a checkout navigation.
          if(page==='social-trial'&&a.matches('a.meta-direct-cta')&&!document.getElementById('meta-eligibility-confirm')?.checked)
            record('checkout_blocked',a,'eligibility_not_confirmed');
          else record('checkout_clicked',a);
        }
        else if(u.host===location.host&&u.pathname===location.pathname&&u.hash==='#claim-form')
          record('trial_cta_clicked',a);
        else if(['https:','http:'].includes(u.protocol))
          record('link_clicked',a,u.host===location.host?'internal':'external');
      }catch(ex){}
    }else{
      var b=e.target.closest&&e.target.closest('button');
      if(b)record('button_clicked',b);
    }
   },true);
   var success=document.querySelector('[data-activity-success],#claimSuccess,#rootClaimSuccess,.claim-success');
   if(success){
    var sent=false;
    function changed(){
      var shown=success.classList.contains('is-visible')||(!success.hidden&&getComputedStyle(success).display!=='none');
      if(shown&&!sent){sent=true;record('form_submitted',success);record('trial_unlocked',success);send();}
    }
    var observer=new MutationObserver(changed);
    observer.observe(success,{attributes:true,attributeFilter:['class','style','hidden']});
    changed();
   }
   document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      record('page_resumed',null);send();
    }
    if(document.visibilityState==='hidden'){
      flushPending();snapshotContactFields(document.getElementById('partnerLeadForm'),'exit_snapshot');
      record('page_hidden',null);send(true);
    }
   });
   window.addEventListener('pagehide',function(){
     flushPending();snapshotContactFields(document.getElementById('partnerLeadForm'),'exit_snapshot');
     // Navigation away also ends this visit period, even on browsers that
     // skip the visibilitychange hidden event.
     record('page_hidden',null);send(true);
   });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 }catch(e){}
})();
