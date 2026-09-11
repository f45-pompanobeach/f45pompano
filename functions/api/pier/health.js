// Deployment refresh: load current Cloudflare environment secrets.
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    service: 'pier-verification',
    telnyx_configured: Boolean(env.TELNYX_API_KEY),
    sender: env.TELNYX_FROM_NUMBER || '+17543463010',
    commit: env.CF_PAGES_COMMIT_SHA || null
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}
export function onRequest(){return new Response('Method not allowed',{status:405})}
