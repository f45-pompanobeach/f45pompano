/* Shared first-party visit tracker for root, static and dynamic partner pages. */
(function(){
  if(window.__f45PageVisitSent)return;
  // A tracking row must represent a visible, top-level landing-page visit.
  // Ignore hidden/prerendered pages, preview frames and embedded documents.
  if(window.top!==window.self||document.prerendering||document.visibilityState!=='visible')return;
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
    // Random first-party visitor ID links visits on returning browsers.
    // It is not an email, phone number, fingerprint or advertising ID.
    var visitor='';
    try{visitor=localStorage.getItem('f45_visitor_id')||''}catch(e){}
    if(!/^[a-f0-9]{32}$/.test(visitor)){
      visitor=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
      try{localStorage.setItem('f45_visitor_id',visitor)}catch(e){}
    }
    var q=new URLSearchParams(location.search);
    var data={page:page,session:sid,visitor:visitor,referrer:document.referrer||'',foreground:true};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id'].forEach(function(k){data[k]=(q.get(k)||'').slice(0,160)});
    window.__f45PageVisitSent=true;
    fetch('/api/page-tracking/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),credentials:'same-origin',keepalive:true}).catch(function(){});
    // Track only successful attempts to follow the social-trial activation link.
    // Let the browser navigate normally; no checkout behavior or checkbox logic changes.
    if(page==='social-trial'){
      document.addEventListener('click',function(event){
        var link=event.target.closest&&event.target.closest('a.meta-direct-cta');
        if(!link||event.defaultPrevented)return;
        var check=document.getElementById('meta-eligibility-confirm');
        if(!check||!check.checked)return;
        try{
          var url=new URL(link.href,location.href);
          if(url.protocol!=='https:'||!(url.hostname==='mindbodyonline.com'||url.hostname.endsWith('.mindbodyonline.com')))return;
          fetch('/api/page-tracking/mindbody-click/',{
            method:'POST',headers:{'content-type':'application/json'},
            body:JSON.stringify(data),credentials:'same-origin',keepalive:true
          }).catch(function(){});
        }catch(e){}
      },false);
    }
  }catch(e){}
})();
