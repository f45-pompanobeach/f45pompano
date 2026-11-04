/* Main website adapter for the shared approved lead-form visual design.
 * The original bootstrap inserts the real form on DOMContentLoaded. This runs
 * afterward, relocates existing DOM elements only, and leaves their event
 * handlers/required inputs unchanged. */
(function(){
  'use strict';
  function apply(){
    var hero=document.querySelector('.video-hero-section');
    var shell=document.querySelector('.root-hero-lead-overlay');
    if(!hero||!shell||shell.classList.contains('lead-pilot-shell'))return;
    var copy=shell.querySelector('.root-hero-copy');
    var card=shell.querySelector('.screenshot-offer-card');
    var video=hero.querySelector('.hero-video');
    var form=card&&card.querySelector('#partnerLeadForm');
    var terms=form&&form.querySelector('#partnerTermsPrivacy');
    var eligibility=form&&form.querySelector('#partnerEligibilityConfirm');
    var sms=form&&form.querySelector('#partnerSmsConsent');
    if(!copy||!card||!video||!form||!terms||!eligibility||!sms)return;

    var oldHeadline=copy.querySelector('h1');
    var oldOffer=oldHeadline&&oldHeadline.textContent||'';
    var offerMatch=oldOffer.match(/(\d+)\s+for\s+(\$[\d,.]+)/i);
    var classCount=offerMatch?offerMatch[1]:'3';
    var cost=offerMatch?offerMatch[2]:'$30';

    var label=form.querySelector('.eligibility-confirm-row');
    var text=label&&label.querySelector('span');
    var zips=text&&text.textContent.match(/\((\d{5}(?:\s*,\s*\d{5})+)\)/);
    if(!label||!text||!zips)return;

    var group=document.createElement('div');
    group.className='lead-pilot-eligibility-group';
    label.parentNode.insertBefore(group,label);
    group.appendChild(label);
    text.textContent="I'm a first-time visitor and a qualifying local resident.";
    var details=document.createElement('details');
    details.className='lead-pilot-eligibility-details';
    var summary=document.createElement('summary');
    summary.textContent='Eligibility details & eligible ZIP codes';
    var description=document.createElement('p');
    description.append('We’ll verify eligibility before your first class. You must be a first-time visitor, live in one of these eligible ZIP codes: ');
    var strong=document.createElement('strong');
    strong.className='lead-pilot-eligible-zips';
    strong.textContent=zips[1];
    description.appendChild(strong);
    description.append(', and be able to verify residency.');
    details.appendChild(summary);
    details.appendChild(description);
    group.appendChild(details);

    var repeated=card.querySelector('.partner-exclusive-header');
    if(repeated)repeated.remove();

    copy.classList.add('partner-hero-copy');
    var ribbon=copy.querySelector('.root-hero-eyebrow');
    if(ribbon){
      ribbon.classList.add('partner-hero-eyebrow');
      ribbon.textContent='Local Resident Exclusive';
    }
    if(oldHeadline){
      oldHeadline.replaceChildren(
        document.createTextNode('Try '));
      var typeSpan=document.createElement('span');
      typeSpan.className='lead-pilot-classes';
      typeSpan.textContent=classCount+' Classes';
      var br=document.createElement('br');
      var priceSpan=document.createElement('span');
      priceSpan.className='lead-pilot-price';
      priceSpan.textContent=cost;
      oldHeadline.append(typeSpan,br,document.createTextNode('for '),priceSpan);
    }
    var sub=copy.querySelector('.root-hero-sub');
    if(sub){
      sub.classList.add('partner-hero-sub');
      sub.textContent='Ready to get started? Complete the short form to unlock your offer and continue to Mindbody.';
    }
    var proof=copy.querySelector('.root-hero-proof-row');
    if(proof)proof.remove();

    var left=document.createElement('div');
    left.className='lead-pilot-offer-column';
    left.append(copy,card);
    var panel=document.createElement('div');
    panel.className='lead-pilot-video-panel';
    panel.setAttribute('aria-label','F45 class workout video');
    video.classList.add('screenshot-hero-video');
    panel.appendChild(video);
    var soundToggle=hero.querySelector('#soundToggle');
    if(soundToggle)panel.appendChild(soundToggle);
    shell.append(left,panel);
    shell.classList.add('lead-pilot-shell');
    hero.classList.add('screenshot-hero','lead-pilot-hero');

    // Apply stored global/page offer values after dynamically created root
    // fields exist (the shared runtime may have executed before this point).
    document.dispatchEvent(new Event('root-lead-ready'));
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
