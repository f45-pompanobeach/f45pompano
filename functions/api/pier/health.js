export async function onRequestGet({ env }) {
  const sender = env.TELNYX_FROM_NUMBER || '+17543463010';
  const result = {
    ok: true,
    service: 'pier-verification',
    telnyx_configured: Boolean(env.TELNYX_API_KEY),
    sender,
    commit: env.CF_PAGES_COMMIT_SHA || null,
    messaging_number: null,
    campaign_assignment: null
  };

  if (env.TELNYX_API_KEY) {
    const headers = { authorization: `Bearer ${env.TELNYX_API_KEY}`, accept: 'application/json' };
    const encoded = encodeURIComponent(sender);

    try {
      const r = await fetch(`https://api.telnyx.com/v2/messaging_phone_numbers/${encoded}`, { headers });
      let j = null;
      try { j = await r.json(); } catch {}
      const d = j?.data || j || {};
      result.messaging_number = {
        http_status: r.status,
        phone_number: d.phone_number || null,
        messaging_profile_id: d.messaging_profile_id || null,
        type: d.type || null,
        eligible_messaging_products: d.eligible_messaging_products || null
      };
      if (!r.ok) {
        result.messaging_number.error_code = j?.errors?.[0]?.code || null;
        result.messaging_number.error_detail = j?.errors?.[0]?.detail || null;
      }
    } catch (e) {
      result.messaging_number = { http_status: null, error: 'request_failed' };
    }

    try {
      const r = await fetch(`https://api.telnyx.com/v2/10dlc/phone_number_campaigns/${encoded}`, { headers });
      let j = null;
      try { j = await r.json(); } catch {}
      const d = j?.data || j || {};
      result.campaign_assignment = {
        http_status: r.status,
        campaign_id: d.campaignId || d.campaign_id || null,
        tcr_campaign_id: d.tcrCampaignId || d.tcr_campaign_id || null,
        assignment_status: d.assignmentStatus || d.assignment_status || null,
        failure_reasons: d.failureReasons || d.failure_reasons || null
      };
      if (!r.ok) {
        result.campaign_assignment.error_code = j?.errors?.[0]?.code || null;
        result.campaign_assignment.error_detail = j?.errors?.[0]?.detail || null;
      }
    } catch (e) {
      result.campaign_assignment = { http_status: null, error: 'request_failed' };
    }
  }

  return new Response(JSON.stringify(result), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
export function onRequest(){return new Response('Method not allowed',{status:405})}
