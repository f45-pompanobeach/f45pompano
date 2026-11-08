/* Shared first-party visit tracker for root, static and dynamic partner pages. */
(function trackVisibleVisit(){
  if(window.__f45PageVisitSent)return;
  // A tracking row must represent a visible, top-level landing-page visit.
  // Ignore hidden/prerendered pages, preview frames and embedded documents.
  if(window.top!==window.self)return;
  if(document.prerendering||document.visibilityState!=='visible'){
    document.addEventListener('visibilitychange',function onReveal(){
      if(document.visibilityState==='visible'&&!document.prerendering){
        document.removeEventListener('visibilitychange',onReveal);
        trackVisibleVisit();
      }
    });
    return;
  }
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
    // This short-lived server-generated trace links an actual HTML GET to
    // its JS visit POST. It isn't a visitor fingerprint or campaign ID.
    var trace=document.querySelector('meta[name="f45-request-id"]')?.content||'';
    if(/^[a-f0-9-]{36}$/i.test(trace))data.request_id=trace;
    // Deliberately allowlist attribution fields. Never transmit whole query
    // strings, raw click IDs, full user agent, or arbitrary URL parameters.
    try{
      var nav=performance.getEntriesByType?.('navigation')?.[0];
      data.navigation_type=nav?.type||'unknown';
    }catch(e){data.navigation_type='unknown'}
    data.entry_path=location.pathname.slice(0,150);
    data.screen_bucket=window.innerWidth<600?'small':window.innerWidth<1100?'medium':'large';
    var allowedKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id','fbclid','gclid','gbraid','wbraid','msclkid','ttclid','qr_visit','qr_id'];
    data.query_keys=[...q.keys()].filter(k=>allowedKeys.includes(k)).slice(0,16).join(',');
    data.click_id_type=['fbclid','gclid','gbraid','wbraid','msclkid','ttclid'].filter(k=>q.has(k)).join(',');
    // First-touch attribution belongs to this random first-party browser ID.
    // Keep only campaign fields and a referrer domain, not personal details.
    try{
      var first=JSON.parse(localStorage.getItem('f45_first_touch')||'null');
      if(!first||typeof first!=='object'){
        var domain='';try{domain=document.referrer?new URL(document.referrer).hostname:''}catch(e){}
        first={source:(q.get('utm_source')||domain||'Direct / Unknown').slice(0,100),
          medium:(q.get('utm_medium')||'').slice(0,100),
          campaign:(q.get('utm_campaign')||'').slice(0,120)};
        localStorage.setItem('f45_first_touch',JSON.stringify(first));
      }
      data.first_touch_source=String(first.source||'').slice(0,100);
      data.first_touch_medium=String(first.medium||'').slice(0,100);
      data.first_touch_campaign=String(first.campaign||'').slice(0,120);
    }catch(e){}
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
