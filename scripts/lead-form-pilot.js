/* Shared partner lead-form presentation, promoted from the validated Sarpino's
 * pilot. Uses page data to preserve partner names, offers, and custom
 * post-submit outcomes. Does not modify submitted fields, consent, tracking,
 * email or Mindbody URLs. The root website and Social Trial use separate flows. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const pages = fs.readdirSync(dataDir).filter(name => name.endsWith('.json') &&
  !['shared.json', 'generic.json', 'meta.json'].includes(name))
  .map(name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')));
const neutral = {
  slug: '_landing-template',
  partner: 'Partner',
  trialType: '3 Classes',
  trialCost: '$30'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function transform(html, partner) {
  if (!html.includes('id="partnerLeadForm"')) throw Error('Pilot requires the existing lead form');
  const heroStart = html.indexOf('<section class="screenshot-hero" id="offer">');
  const heroEnd = heroStart < 0 ? -1 : html.indexOf('</section>', heroStart);
  if (heroStart < 0 || heroEnd < 0) throw Error('Pilot hero not found');
  const hero = html.slice(heroStart, heroEnd + '</section>'.length);
  const video = hero.match(/<video class="screenshot-hero-video"[\s\S]*?<\/video>/)?.[0];
  const copyStart = hero.indexOf('    <div class="partner-hero-copy">');
  const cardStart = hero.indexOf('    <div class="screenshot-offer-card form-overlay-card" id="claim-form">');
  const shellEnd = hero.lastIndexOf('\n  </div>\n</section>');
  if (!video || copyStart < 0 || cardStart <= copyStart || shellEnd <= cardStart)
    throw Error('Pilot source structure changed');

  let copy = hero.slice(copyStart, cardStart).trim();
  let card = hero.slice(cardStart, shellEnd).trim();

  // The hero already announces the Sarpino's offer. Remove the duplicate.
  const redundant = /<div class="partner-exclusive-header">[\s\S]*?<\/div>\s*/;
  if (!redundant.test(card)) throw Error('Expected redundant partner heading missing');
  card = card.replace(redundant, '');

  // Keep the required residency checkbox and its ID/name/validation.
  // Put detailed ZIP requirements in an accessible, expandable panel.
  const eligibilityText = /(<label class="eligibility-confirm-row">[\s\S]*?<span>)[\s\S]*?(<\/span><\/label>)/;
  const originalEligibility = card.match(eligibilityText);
  if (!originalEligibility) throw Error('Required residency checkbox missing');
  const zipList = originalEligibility[0].match(/\((\d{5}(?:\s*,\s*\d{5})+)\)/);
  if (!zipList) throw Error('ZIP list missing in original eligibility label');
  card = card.replace(eligibilityText, (_, begin, end) =>
    '<div class="lead-pilot-eligibility-group">\n        ' +
    begin + "I'm a first-time visitor and a qualifying local resident." + end +
    '\n        <details class="lead-pilot-eligibility-details">' +
    '<summary>Eligibility details &amp; eligible ZIP codes</summary>' +
    '<p>We’ll verify eligibility before your first class. You must be a first-time visitor, ' +
    'live in one of these eligible ZIP codes: <strong class="lead-pilot-eligible-zips">' +
    escapeHtml(zipList[1]) + '</strong>, and be able to verify residency.</p></details>' +
    '\n        </div>'
  );

  copy = copy.replace(
    '<div class="partner-hero-eyebrow">First-time local residents only</div>',
    '<div class="partner-hero-eyebrow">' + escapeHtml(partner.partner) + ' Exclusive</div>'
  );
  copy = copy.replace(/<h1>[\s\S]*?<\/h1>/,
    '<h1>Try <span class="lead-pilot-classes">' + escapeHtml(partner.trialType) +
    '</span><br>for <span class="lead-pilot-price">' + escapeHtml(partner.trialCost) + '</span></h1>');
  copy = copy.replace(
    'Fill out the quick form to unlock your trial offer for F45 Training Pompano Beach.',
    partner.slug === 'sands-harbor'
      ? 'Ready to get started? Complete the short form and our team will contact you to help you get set up.'
      : 'Ready to get started? Complete the short form to unlock your offer and continue to Mindbody.'
  );
  copy = copy.replace(/<div class="partner-hero-proof-row"[\s\S]*?<\/div>/, '');

  const newHero = '<section class="screenshot-hero lead-pilot-hero" id="offer">\n' +
    '  <div class="lead-pilot-shell">\n' +
    '    <div class="lead-pilot-offer-column">\n' + copy + '\n' + card + '\n    </div>\n' +
    '    <div class="lead-pilot-video-panel" aria-label="F45 class workout video">\n' +
    video + '\n    </div>\n' +
    '  </div>\n</section>';
  html = html.slice(0, heroStart) + newHero + html.slice(heroEnd + '</section>'.length);

  if (!html.includes('<body>')) throw Error('Pilot body tag missing');
  html = html.replace('<body>', '<body class="lead-form-pilot">');

  const navOpen = '<header class="screenshot-nav">';
  if (!html.includes(navOpen)) throw Error('Pilot navigation missing');
  html = html.replace(navOpen, navOpen +
    '\n    <div class="lead-pilot-brand"><img src="/f45-logo-transparent-v2.svg" alt="F45 Training Pompano Beach"></div>');

  const navEnd = '    </nav>\n  </header>';
  if (!html.includes(navEnd)) throw Error('Pilot nav closing marker missing');
  html = html.replace(navEnd,
    '    </nav>\n' +
    '    <div class="lead-pilot-nav-actions"><button type="button" class="lead-pilot-nav-book">Unlock Trial</button></div>\n' +
    '  </header>\n' +
    '  <div class="lead-pilot-mobile-bar" hidden><button type="button" class="lead-pilot-mobile-book">↑ Unlock Trial</button></div>');

  if (!html.includes('<div class="fixed-header-spacer"')) throw Error('Pilot spacer missing');

  // CSS loads after original partner layout rules. The source templates and
  // their other partner pages remain identical.
  html = html.replace('</head>',
    '<link rel="stylesheet" href="/lead-form-pilot.css?v=3">\n</head>');
  html = html.replace('</body>',
    '<script defer src="/lead-form-pilot.js?v=3"></script>\n</body>');
  // Refresh the runtime only for this pilot; leave all other pages' assets
  // and cache keys untouched.
  if (!html.includes('/landing-runtime.js?v=9'))
    throw Error('Expected landing runtime script missing');
  html = html.replace('/landing-runtime.js?v=9', '/landing-runtime.js?v=11');

  for (const needle of ['id="partnerLeadForm"', 'id="claimSuccess"', 'id="partnerEligibilityConfirm"',
    'id="partnerTermsPrivacy"', 'id="partnerSmsConsent"', 'id="offer-video"',
    'class="lead-pilot-video-panel"', 'class="lead-pilot-mobile-bar"',
    'class="lead-pilot-eligibility-details"']) {
    if (!html.includes(needle)) throw Error('Pilot lost required markup: ' + needle);
  }
  if ((html.match(/id="partnerLeadForm"/g) || []).length !== 1 ||
      (html.match(/id="offer-video"/g) || []).length !== 1)
    throw Error('Pilot duplicated core elements');
  return html;
}

const targets = pages.flatMap(page => [
  {relative: page.slug + '.html', page},
  {relative: page.slug + '/index.html', page}
]);
targets.push({relative: '_landing-template/index.html', page: neutral});
const seen = new Set();
for (const {relative, page} of targets) {
  const target = path.join(root, 'dist', relative);
  if (!fs.existsSync(target)) throw Error('Expected generated partner page missing: ' + relative);
  const before = fs.readFileSync(target, 'utf8');
  const after = transform(before, page);
  fs.writeFileSync(target, after);
  if (!seen.has(page.slug)) seen.add(page.slug);
  console.log('Applied approved lead-form layout to ' + relative);
}
if (seen.size !== pages.length + 1)
  throw Error('Some partner or dynamic landing page templates were not updated');
console.log('Upgraded ' + pages.length + ' existing partners plus the dynamic landing template.');
