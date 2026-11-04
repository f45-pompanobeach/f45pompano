/* Deterministic build-time homepage lead form layout.
 * Main site form is included in HTML by build.js. Rearrange the existing
 * markup without re-creating inputs or changing API/consent/checkout flows. */
const fs=require('fs');
const path=require('path');
const target=path.join(__dirname,'..','dist','index.html');
let html=fs.readFileSync(target,'utf8');

function extractDiv(source,start){
  if(start<0 || !source.slice(start).startsWith('<div'))
    throw Error('Expected opening div at '+start);
  const re=/<\/?div\b[^>]*>/gi;
  re.lastIndex=start;
  let depth=0,m;
  while((m=re.exec(source))){
    depth+=/^<\/div/i.test(m[0])?-1:1;
    if(depth===0)return {html:source.slice(start,re.lastIndex),end:re.lastIndex};
  }
  throw Error('Unclosed homepage div at '+start);
}
const heroStart=html.indexOf('<section class="screenshot-hero video-hero-section">');
const heroEnd=heroStart<0?-1:html.indexOf('</section>',heroStart);
if(heroStart<0||heroEnd<0)throw Error('Original homepage hero not found');
const hero=html.slice(heroStart,heroEnd+'</section>'.length);
const video=hero.match(/<video\b[\s\S]*?<\/video>/)?.[0];
const toggle=hero.match(/<button class="sound-toggle-btn"[\s\S]*?<\/button>/)?.[0]||'';
const overlayStart=hero.indexOf('<div class="root-hero-lead-overlay" id="claim-form">');
if(!video||overlayStart<0)throw Error('Main site video or form overlay missing');
const overlay=extractDiv(hero,overlayStart).html;
const copyStart=overlay.indexOf('<div class="root-hero-copy">');
const cardStart=overlay.indexOf('<div class="screenshot-offer-card form-overlay-card">');
if(copyStart<0||cardStart<0)throw Error('Main site offer copy or form card missing');
let copy=extractDiv(overlay,copyStart).html;
let card=extractDiv(overlay,cardStart).html;

copy=copy.replace('<div class="root-hero-copy">','<div class="root-hero-copy partner-hero-copy">');
copy=copy.replace('class="root-hero-eyebrow"',
  'class="root-hero-eyebrow partner-hero-eyebrow"');
copy=copy.replace('>First-time local residents only</div>',
  '>Local Resident Exclusive</div>');
const existing=copy.match(/<h1>[\s\S]*?<\/h1>/)?.[0]||'';
const offer=existing.match(/(\d+)\s+for\s+(\$[\d,.]+)/i);
if(!offer)throw Error('Could not parse homepage default offer');
copy=copy.replace(existing,
  '<h1>Try <span class="lead-pilot-classes">'+offer[1]+' Classes</span><br>for '+
  '<span class="lead-pilot-price">'+offer[2]+'</span></h1>');
copy=copy.replace('class="root-hero-sub"',
  'class="root-hero-sub partner-hero-sub"');
copy=copy.replace('Fill out the quick form to unlock your trial offer for F45 Training Pompano Beach.',
  'Ready to get started? Complete the short form to unlock your offer and continue to Mindbody.');
copy=copy.replace(/<div class="root-hero-proof-row"[\s\S]*?<\/div>/,'');

const redundant=/<div class="partner-exclusive-header">[\s\S]*?<\/div>\s*/;
if(!redundant.test(card))throw Error('Homepage duplicate offer header missing');
card=card.replace(redundant,'');
const label=/(<label class="eligibility-confirm-row">[\s\S]*?<span>)[\s\S]*?(<\/span><\/label>)/;
const original=card.match(label);
const zip=original&&original[0].match(/\((\d{5}(?:\s*,\s*\d{5})+)\)/);
if(!original||!zip)throw Error('Homepage required eligibility and ZIP disclosure missing');
card=card.replace(label,(_,begin,end)=>'<div class="lead-pilot-eligibility-group">\n'+
  begin+"I'm a first-time visitor and a qualifying local resident."+end+
  '<details class="lead-pilot-eligibility-details">'+
  '<summary>Eligibility details &amp; eligible ZIP codes</summary>'+
  '<p>We’ll verify eligibility before your first class. You must be a first-time visitor, '+
  'live in one of these eligible ZIP codes: <strong class="lead-pilot-eligible-zips">'+
  zip[1]+'</strong>, and be able to verify residency.</p></details></div>');

const panel='<div class="lead-pilot-video-panel" aria-label="F45 class workout video">\n'+
  video.replace('class="hero-video"','class="hero-video screenshot-hero-video"')+
  '\n'+toggle+'\n</div>';
const rebuilt='<section class="screenshot-hero video-hero-section lead-pilot-hero">\n'+
  '<div class="root-hero-lead-overlay lead-pilot-shell" id="claim-form">\n'+
  '<div class="lead-pilot-offer-column">\n'+copy+'\n'+card+'\n</div>\n'+panel+
  '\n</div>\n</section>';
html=html.slice(0,heroStart)+rebuilt+html.slice(heroEnd+'</section>'.length);

if(!html.includes('<body>'))throw Error('Homepage body marker missing');
html=html.replace('<body>','<body class="lead-form-pilot root-lead-design">');
const navOpen='<header class="screenshot-nav">';
if(!html.includes(navOpen))throw Error('Homepage navigation missing');
html=html.replace(navOpen,navOpen+
  '\n<div class="lead-pilot-brand"><img src="/f45-logo-transparent-v2.svg" alt="F45 Training Pompano Beach"></div>');
const navEnd='    </nav>\n  </header>';
if(!html.includes(navEnd))throw Error('Homepage navigation end missing');
html=html.replace(navEnd,
  '    </nav>\n'+
  '    <div class="lead-pilot-nav-actions"><button class="lead-pilot-nav-book" type="button">Unlock Trial</button></div>\n'+
  '  </header>\n'+
  '  <div class="lead-pilot-mobile-bar" hidden><button class="lead-pilot-mobile-book" type="button">↑ Unlock Trial</button></div>');
html=html.replace('</head>',
  '<link rel="stylesheet" href="/lead-form-pilot.css?v=3">\n'+
  '<link rel="stylesheet" href="/partner-form-checkboxes.css?v=1">\n'+
  '<link rel="stylesheet" href="/root-lead-design.css?v=2">\n</head>');
html=html.replace('</body>',
  '<script defer src="/lead-form-pilot.js?v=3"></script>\n</body>');
// Home previously served v9 of the shared runtime, which some browsers cache
// despite the current build containing updated eligibility dropdown behavior.
// Refresh only the homepage runtime; leave all other landing pages alone.
if(!html.includes('/landing-runtime.js?v=9'))
  throw Error('Expected homepage landing runtime version missing');
html=html.replace('/landing-runtime.js?v=9','/landing-runtime.js?v=12');
// Unlike the former client adapter, the form and layout exist on the first
// paint. The legacy DOMContentLoaded submit listener sees #claim-form already
// present and attaches normally, without duplicating the form.
for(const needle of ['class="root-hero-lead-overlay lead-pilot-shell"', 'id="partnerLeadForm"',
  'id="partnerEligibilityConfirm"', 'id="partnerTermsPrivacy"',
  'id="partnerSmsConsent"','id="offer-video"']){
  // Homepage's original video id is heroVideo, not offer-video.
  if(needle==='id="offer-video"')continue;
  if(!html.includes(needle))throw Error('Homepage redesign lost '+needle);
}
if(!html.includes('id="heroVideo"') || !html.includes('id="soundToggle"'))
  throw Error('Homepage video and sound toggle missing');
const compactRow = html.match(/<label class="eligibility-confirm-row">[\s\S]*?<\/label>/)?.[0] || '';
if(!compactRow.includes("I'm a first-time visitor and a qualifying local resident.") ||
   compactRow.includes('one of these ZIP codes'))
  throw Error('Homepage checkbox must stay compact with ZIPs only in dropdown');
if(!html.includes('/landing-runtime.js?v=12'))
  throw Error('Homepage runtime cache-busting not applied');
if(!html.includes('action="/api/leads/intake"'))
  throw Error('Homepage lead form action missing');
fs.writeFileSync(target,html);
console.log('Built homepage offer, video, and required lead form directly in initial HTML.');
