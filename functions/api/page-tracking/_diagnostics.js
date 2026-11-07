// Privacy-conscious visit diagnostics. No raw IP, full UA, full URL or raw ad-click ID.
// Optional metadata is evidence, NOT proof that a visitor is a bot or a person.
const txt=(v,n=100)=>String(v??'').trim().slice(0,n).replace(/[\u0000-\u001f]/g,'');
const metaFields=[
 'browser','operating_system','device_type','navigation_type','entry_path',
 'query_keys','first_touch_source','first_touch_medium','first_touch_campaign',
 'click_id_type','network_hash','network_asn','network_org','country',
 'bot_signal','traffic_review','review_reasons','screen_bucket'
];
export async function ensureDiagnosticSchema(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS page_tracking_diagnostics(
  visit_id TEXT PRIMARY KEY, browser TEXT, operating_system TEXT, device_type TEXT,
  navigation_type TEXT, entry_path TEXT, query_keys TEXT,
  first_touch_source TEXT, first_touch_medium TEXT, first_touch_campaign TEXT,
  click_id_type TEXT, network_hash TEXT, network_asn TEXT, network_org TEXT,
  country TEXT, bot_signal TEXT, traffic_review TEXT, review_reasons TEXT,
  screen_bucket TEXT, captured_at TEXT NOT NULL)`).run();
}
function deviceFromUA(raw){
 const ua=String(raw||'');
 const browser=/FBAN|FBAV|Instagram/i.test(ua)?'Meta in-app':/Edg\//i.test(ua)?'Edge':/CriOS|Chrome\//i.test(ua)?'Chrome':/FxiOS|Firefox\//i.test(ua)?'Firefox':/Safari\//i.test(ua)?'Safari':'Other / unknown';
 const os=/iPhone|iPad|iPod/i.test(ua)?'iOS / iPadOS':/Android/i.test(ua)?'Android':/Windows/i.test(ua)?'Windows':/Mac OS X|Macintosh/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Unknown';
 const device=/iPad|Tablet/i.test(ua)?'tablet':/Mobi|iPhone|Android/i.test(ua)?'mobile':'desktop / unknown';
 return {browser,operating_system:os,device_type:device};
}
async function networkToken(request,env){
 const ip=request.headers.get('cf-connecting-ip');
 // Never persist or return an unencrypted network identifier.
 const secret=String(env?.PAGE_TRACKING_HASH_KEY||env?.EMAIL_GATEWAY_APP_KEY||'');
 if(!ip||secret.length<16)return '';
 const month=new Date().toISOString().slice(0,7);
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,enc.encode('page-tracking|'+month+'|'+ip));
 return month+':'+Array.from(new Uint8Array(signature).slice(0,12),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function captureDiagnostics(db,request,env,{visitId,page,session,payload}){
 try{
  await ensureDiagnosticSchema(db);
  const cf=request.cf||{},ua=request.headers.get('user-agent')||'';
  const inferred=deviceFromUA(ua);
  const uaBot=/(?:facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|googlebot|bingbot|headlesschrome|lighthouse|pagespeed)/i.test(ua);
  const browser=txt(inferred.browser,45),os=txt(inferred.operating_system,45),device=txt(inferred.device_type,35);
  const nav=['navigate','reload','back_forward','prerender'].includes(payload?.navigation_type)?payload.navigation_type:'unknown';
  const entry=txt(payload?.entry_path,150).replace(/[^\w/.-]/g,'');
  const queryKeys=txt(payload?.query_keys,160).replace(/[^a-z0-9_,]/gi,'');
  const clickIdType=txt(payload?.click_id_type,60).replace(/[^a-z0-9_,]/gi,'');
  const asn=Number.isSafeInteger(Number(cf.asn))&&Number(cf.asn)>0?String(cf.asn):'';
  const networkOrg=txt(cf.asOrganization,100),country=txt(cf.country,3);
  const botScore=Number(cf.botManagement?.score);
  const verified=cf.botManagement?.verifiedBot===true;
  const signal=verified||uaBot?'known_bot':Number.isFinite(botScore)&&botScore>=1&&botScore<=99?'score:'+botScore:'unavailable';
  const reasons=[];
  if(verified||uaBot)reasons.push('known_automation');
  if(Number.isFinite(botScore)&&botScore>0&&botScore<20)reasons.push('low_bot_score');
  if(nav==='prerender')reasons.push('prerender');
  // Never classify zero engagement or missing UTM as bot evidence.
  const review=reasons.includes('known_automation')?'known_automated':reasons.length?'review':'unassessed';
  const data={browser,operating_system:os,device_type:device,navigation_type:nav,entry_path:entry,query_keys:queryKeys,
   first_touch_source:txt(payload?.first_touch_source,100),first_touch_medium:txt(payload?.first_touch_medium,100),
   first_touch_campaign:txt(payload?.first_touch_campaign,120),click_id_type:clickIdType,
   network_hash:await networkToken(request,env),network_asn:asn,network_org:networkOrg,
   country,bot_signal:signal,traffic_review:review,review_reasons:reasons.join(','),
   screen_bucket:['small','medium','large'].includes(payload?.screen_bucket)?payload.screen_bucket:'',
   captured_at:new Date().toISOString()};
  // Activity POST can win the visit creation race: locate using page + session,
  // never assume the initial insert was the row ultimately retained.
  const actual=await db.prepare('SELECT id FROM landing_page_visits WHERE page=? AND session_id=? ORDER BY visited_at ASC LIMIT 1')
   .bind(page,session).first();
  const id=actual?.id||visitId;
  const columns=['visit_id',...metaFields,'captured_at'];
  await db.prepare('INSERT OR IGNORE INTO page_tracking_diagnostics('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')')
   .bind(id,...metaFields.map(k=>data[k]||''),data.captured_at).run();
  // Purge network correlation tokens after seven days; other coarse metadata stays.
  await db.prepare("UPDATE page_tracking_diagnostics SET network_hash='' WHERE network_hash<>'' AND captured_at<?")
   .bind(new Date(Date.now()-7*86400000).toISOString()).run();
 }catch(error){console.error('Noncritical visit diagnostics unavailable',error?.message||error)}
}
export {metaFields};
