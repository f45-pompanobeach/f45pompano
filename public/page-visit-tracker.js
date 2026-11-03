/* Shared first-party visit tracker for root, static and dynamic partner pages. */
(function(){
  if(window.__f45PageVisitSent)return;
  try{
    var parts=location.pathname.split('/').filter(Boolean);
    var page=parts[0]==='landing'?(parts[1]||'landing'):(parts[0]||'root');
    if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(page))return;
    var sid;
    try{sid=sessionStorage.getItem('f45_page_tracking_session')}catch(e){}
    if(!/^[a-f0-9]{32}$/.test(sid||'')){
      sid=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(x){return x.toString(16).padStart(2,'0')}).join('');
      try{sessionStorage.setItem('f45_page_tracking_session',sid)}catch(e){}
    }
    var q=new URLSearchParams(location.search);
    var data={page:page,session:sid,referrer:document.referrer||''};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id'].forEach(function(k){data[k]=(q.get(k)||'').slice(0,160)});
    window.__f45PageVisitSent=true;
    fetch('/api/page-tracking/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),credentials:'same-origin',keepalive:true}).catch(function(){});
  }catch(e){}
})();
