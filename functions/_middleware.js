// Social link previews only: render current landing offer into crawler-visible HTML.
// Keep forms, client runtime, tracking and API responses unchanged.
import { getGlobal, getPage } from './api/landing/_shared.js';

const SHARE_IMAGE = 'https://f45pompano.com/f45-pompano-share-v2.jpg';
function escapeAttr(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function setMeta(html, name, value, kind = 'property') {
  const re = new RegExp('(<meta\\s+' + kind + '="' + name + '"\\s+content=")[^"]*(")', 'i');
  const escaped = escapeAttr(value);
  if (re.test(html)) return html.replace(re, (_, prefix, suffix) => prefix + escaped + suffix);
  return html.replace('</head>', '<meta ' + kind + '="' + name + '" content="' + escaped + '">\n</head>');
}
function landingSlug(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return 'root';
  if (parts[0] === 'landing' && parts[1]) return parts[1].toLowerCase();
  if (parts.length === 1 && /^[a-z0-9-]+(?:\.html)?$/i.test(parts[0]))
    return parts[0].toLowerCase().replace(/\.html$/, '');
  return null;
}
export async function onRequest(context) {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD')
    return context.next();
  const { pathname } = new URL(context.request.url);
  if (pathname.startsWith('/api/') || pathname.startsWith('/leads-trials/') ||
      pathname.startsWith('/landing/admin/') || pathname.startsWith('/landing-admin/') ||
      pathname.startsWith('/_landing-template/')) return context.next();
  const slug = landingSlug(pathname);
  if (!slug) return context.next();
  let global, page;
  try {
    [global, page] = await Promise.all([
      getGlobal(context.env), getPage(context.env, slug)
    ]);
  } catch {
    return context.next(); // If settings storage is unavailable, serve existing page.
  }
  if (!global?.trialType || !global?.trialCost) return context.next();
  const response = await context.next();
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html'))
    return response;
  // Existing static partner pages may not have an individual DB record.
  // Confirm the response is actually a trial landing page before changing its metadata.
  const htmlSource = await response.text();
  const isKnown = slug === 'root' || slug === 'social-trial' || !!page ||
    htmlSource.includes('id="partnerLeadForm"') || htmlSource.includes('id="rootLeadForm"');
  if (!isKnown) return new Response(htmlSource, response);

  const override = page?.offerOverrideEnabled === true;
  const trialType = override && page.trialType ? page.trialType : global.trialType;
  const trialCost = override && page.trialCost ? page.trialCost : global.trialCost;
  if (!trialType || !trialCost) return response;
  const title = 'F45 Training Pompano Beach | ' + trialType + ' for ' + trialCost;
  const description = 'First-time local residents: try ' + trialType + ' for ' +
    trialCost + ' at F45 Training Pompano Beach.';
  let html = htmlSource;
  // The server already has the exact saved settings. Give them to the page
  // before its deferred runtime runs, so it never paints a different offer.
  // Hide the offer-specific region only until the runtime applies those settings.
  // This keeps the rest of the landing page visible and avoids layout shifts.
  const initialConfig = JSON.stringify({slug,global,page:page||{}})
    .replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/&/g,'\\u0026').replace(/\\u2028/g,'\\u2028').replace(/\\u2029/g,'\\u2029');
  const preload = `<style>
html.landing-offer-pending .screenshot-hero,
html.landing-offer-pending .root-hero-copy,
html.landing-offer-pending .root-claim-form,
html.landing-offer-pending .partner-hero-copy,
html.landing-offer-pending .partner-exclusive-header,
html.landing-offer-pending .claim-form-section,
html.landing-offer-pending .mid-cta-sub {visibility:hidden !important}
</style><script>document.documentElement.classList.add('landing-offer-pending');window.__LANDING_PRELOADED__=${initialConfig};</script>`;
  html = html.replace(/<head([^>]*)>/i, (tag)=>tag+preload);
  for (const [name, value, kind] of [
    ['og:title', title, 'property'], ['og:description', description, 'property'],
    ['twitter:title', title, 'name'], ['twitter:description', description, 'name'],
    ['og:image', SHARE_IMAGE, 'property'], ['og:image:secure_url', SHARE_IMAGE, 'property'],
    ['twitter:image', SHARE_IMAGE, 'name'], ['og:image:type', 'image/jpeg', 'property']
  ]) html = setMeta(html, name, value, kind);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-cache, must-revalidate');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
