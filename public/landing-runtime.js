(function(){
  function slugFromPath(){
    const parts=location.pathname.split('/').filter(Boolean);
    if(!parts.length)return 'root';
    if(parts[0]==='landing'&&parts[1])return parts[1].toLowerCase();
    return parts[0].toLowerCase();
  }
  function countFromType(v){
    const m=String(v||'').match(/\d+/);
    return m?m[0]:String(v||'').trim();
  }
  function setVideo(url){
    if(!url)return;
    const video=document.querySelector('#offer-video,.hero-video');
    if(!video)return;
    let source=video.querySelector('source');
    if(source)source.src=url;else video.src=url;
    try{video.load();const p=video.play();if(p&&p.catch)p.catch(()=>{});}catch{}
  }
  function setMeta(name,content){
    const el=document.querySelector('meta[name="'+name+'"]');
    if(el)el.setAttribute('content',content);
  }
  function setProperty(property,content){
    const el=document.querySelector('meta[property="'+property+'"]');
    if(el)el.setAttribute('content',content);
  }
  function apply(cfg){
    window.__LANDING_CONFIG__=cfg;
    const storedPage=cfg.page||{};
    const global=cfg.global||{};
    const usePageOfferOverrides=storedPage.offerOverrideEnabled===true;
    const offerKeys=['trialType','trialCost','trialDuration','regularPrice','firstClassBookingText','mindbodyUrl'];
    const effectiveStored={...storedPage};
    if(!usePageOfferOverrides)for(const key of offerKeys)delete effectiveStored[key];
    const page={...global,...effectiveStored};
    const isRoot=cfg.slug==='root'||storedPage.pageKind==='root';
    const isSocial=cfg.slug==='social-trial'||storedPage.pageKind==='social';
    if(page.enabled===false&&!isRoot){
      document.body.innerHTML='<main style="font-family:system-ui;padding:48px 20px;text-align:center"><h1>This offer is currently unavailable.</h1><p>Please contact F45 Training Pompano Beach for current options.</p></main>';
      return;
    }
    const count=countFromType(page.trialType);
    const trialCost=page.trialCost||'';
    const offer=count&&trialCost?count+' for '+trialCost+' Trial':'Trial';
    const embeddedPartnerInput=document.querySelector('#partnerLeadForm input[name="Partner"]');
    const embeddedPartner=embeddedPartnerInput&&embeddedPartnerInput.value?embeddedPartnerInput.value.trim():'';
    const partnerName=storedPage.partner||embeddedPartner||'Partner';

    setVideo(storedPage.videoUrl||global.defaultVideoUrl||'/trial-video.mp4');

    if(page.trialType&&page.trialCost){
      const hero=document.querySelector(isRoot?'.root-hero-copy h1':'.partner-hero-copy h1');
      if(hero)hero.innerHTML='Reserve Your <span>'+offer.replace(/</g,'&lt;')+'</span>';

      document.querySelectorAll('.mid-cta-sub').forEach(el=>{el.textContent=page.trialType+' for '+page.trialCost;});

      if(isSocial){
        const h=document.querySelector('.claim-form-header h2');
        if(h)h.textContent='Reserve Your '+page.trialType+' for '+page.trialCost;
        const intro=document.querySelector('.claim-form-header p');
        if(intro)intro.textContent='Activate your '+page.trialCost+' trial and book your first class through our official Mindbody checkout. Eligibility will be verified before your first class.';
        const cta=document.querySelector('.meta-direct-cta');
        if(cta){cta.textContent='Activate Your '+page.trialCost+' Trial';if(page.mindbodyUrl)cta.href=page.mindbodyUrl;}
        const booking=document.querySelector('.meta-global-booking-note');
        if(booking&&page.firstClassBookingText)booking.textContent=page.firstClassBookingText;
        const trialFaq=[...document.querySelectorAll('.faq-item')].find(item=>/what if i can't use all/i.test(item.querySelector('.faq-q h4')?.textContent||''));
        if(trialFaq){const q=trialFaq.querySelector('.faq-q h4');const a=trialFaq.querySelector('.faq-a p');if(q)q.textContent="What if I can't use all "+page.trialType+' in '+(page.trialDuration||'the trial period')+'?';if(a)a.textContent='Since this is a special trial offer, the '+page.trialType+' must be used within '+(page.trialDuration||'the trial period')+' of your first session — no extensions. Most members tell us they knew F45 was for them after just 1 or 2 classes!';}
      }else if(isRoot){
        const h=document.querySelector('.root-claim-form-header h2');
        if(h)h.textContent='Reserve '+count+' for '+page.trialCost+' Trial';
        const offerInput=document.querySelector('#rootLeadForm input[name="Offer"]');
        if(offerInput)offerInput.value=page.trialType+' for '+page.trialCost;
        const success=document.querySelector('#rootClaimSuccess h3');
        if(success)success.textContent='Your '+page.trialType+' for '+page.trialCost+' offer is ready.';
        const cta=document.querySelector('#rootClaimSuccess .promo-claim-btn');
        if(cta&&page.mindbodyUrl)cta.href=page.mindbodyUrl;
        const note=document.querySelector('.root-form-small-note');
        if(note&&page.firstClassBookingText)note.textContent=page.firstClassBookingText;
      }else{
        const h=document.querySelector('.partner-exclusive-header h2');
        if(h)h.textContent=partnerName+' Exclusive';
        const p=document.querySelector('.partner-exclusive-header p');
        if(p)p.textContent='Submit your info first. Then your exclusive '+page.trialType+' for '+page.trialCost+' offer will unlock.';
        const offerInput=document.querySelector('#partnerLeadForm input[name="Offer"]');
        if(offerInput)offerInput.value=page.trialType+' for '+page.trialCost;
        const partnerInput=document.querySelector('#partnerLeadForm input[name="Partner"]');
        if(partnerInput)partnerInput.value=partnerName;
        const success=document.querySelector('#claimSuccess h3');
        if(success)success.textContent='Your '+partnerName+' exclusive '+page.trialType+' for '+page.trialCost+' offer is ready.';
        const cta=document.querySelector('#claimSuccess .screenshot-cta');
        if(cta){
          cta.textContent='Continue to Mindbody — '+page.trialCost+' Trial';
          if(page.mindbodyUrl)cta.href=page.mindbodyUrl;
        }
        const note=document.querySelector('.form-small-note');
        if(note&&page.firstClassBookingText)note.textContent=page.firstClassBookingText;
        const banner=document.querySelector('.promo-code-box span');
        if(banner)banner.textContent=partnerName+' Exclusive Offer';
      }

      const title='F45 Training Pompano Beach | '+page.trialType+' for '+page.trialCost;
      document.title=title;
      setProperty('og:title',title);
      setMeta('twitter:title',title);
    }

    const zips=Array.isArray(global.qualifiedZipCodes)?global.qualifiedZipCodes:[];
    if(zips.length){
      const eligibility=document.querySelector('.eligibility-confirm-row span');
      if(eligibility)eligibility.textContent='I confirm that I am a first-time visitor and live in one of these ZIP codes ('+zips.join(', ')+'), and am able to verify residency for this offer.';
      const metaEligibility=document.querySelector('.meta-eligibility-check span');
      if(metaEligibility)metaEligibility.textContent='I confirm I am a first-time visitor, live in one of these ZIP codes ('+zips.join(', ')+'), and am able to verify residency for this offer.';

      document.querySelectorAll('.faq-item').forEach(item=>{
        const q=item.querySelector('.faq-q h4');
        if(!q||!/who qualifies for this offer/i.test(q.textContent||''))return;
        const strong=item.querySelector('.faq-a strong');
        if(strong)strong.textContent=zips.join(', ');
      });
    }
  }

  const slug=slugFromPath();
  if(window.__LANDING_PRELOADED__){
    apply(window.__LANDING_PRELOADED__);
    return;
  }
  fetch('/api/landing/config?slug='+encodeURIComponent(slug),{headers:{'accept':'application/json'},cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      if(!data||!data.ok)return;
      const hasGlobal=data.global&&Object.keys(data.global).length;
      const hasPage=data.page&&Object.keys(data.page).length;
      if(!hasGlobal&&!hasPage)return;
      apply({slug,global:data.global||{},page:data.page||{}});
    })
    .catch(()=>{});
})();