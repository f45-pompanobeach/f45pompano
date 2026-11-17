// Private candidate record management. Set CANDIDATE_EVAL_ADMIN_KEY as a Pages secret.
const j=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const safe=s=>String(s??'').trim().slice(0,3000);
const allowed=[['English & Spanish Communication',4,20],['Sales Skills',6,30],['Organization & Independence',4,20],['Customer Service & Member Retention',3,15],['Additional Skills & Role Fit',3,15]];
async function authorized(req,env){
 // Cloudflare Access identity JWT is verified cryptographically; untrusted request headers alone are insufficient.
 const team=String(env.CANDIDATE_EVAL_ACCESS_TEAM||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
 const audience=String(env.CANDIDATE_EVAL_ACCESS_AUD||'').trim();
 const jwt=req.headers.get('Cf-Access-Jwt-Assertion');
 if(!team||!audience||!jwt)return false;
 try{
  const [h,p,s]=jwt.split('.');if(!h||!p||!s)return false;
  const decode=x=>Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-x.length%4)%4)),c=>c.charCodeAt(0));
  const header=JSON.parse(new TextDecoder().decode(decode(h))),payload=JSON.parse(new TextDecoder().decode(decode(p)));
  if(header.alg!=='RS256'||!header.kid||payload.iss!=='https://'+team||!Array.isArray(payload.aud)||!payload.aud.includes(audience)||payload.exp*1000<=Date.now()||payload.nbf&&payload.nbf*1000>Date.now())return false;
  const keys=await fetch('https://'+team+'/cdn-cgi/access/certs').then(r=>r.json());const jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(s),new TextEncoder().encode(h+'.'+p));
 }catch{return false}
}
function validate(b,final){if(!b||typeof b!=='object'||!Array.isArray(b.sections)||b.sections.length!==5||!safe(b.candidate)||!/^\d{4}-\d{2}-\d{2}$/.test(b.date||''))return null;let total=0;for(let i=0;i<5;i++){const [name,count,max]=allowed[i],s=b.sections[i];if(s?.name!==name||s?.max!==max||s.ratings?.length!==count)return null;for(const r of s.ratings){if(r.score===null||r.score===0||r.score===''){if(final)return null;continue}if(!Number.isInteger(r.score)||r.score<1||r.score>5)return null;total+=r.score}}if(final&&(!b.reason||!b.recommendation||!b.trust||!b.english||!b.spanish||!b.preference||!b.schedule||!b.weekend))return null;return total}
export async function onRequest({request,env}){
 if(!await authorized(request,env))return j(401,{ok:false,message:'Saved evaluations require Cloudflare Access. Configure CANDIDATE_EVAL_ACCESS_TEAM and CANDIDATE_EVAL_ACCESS_AUD and allow both interviewers.'});
 const db=env.CANDIDATE_EVAL_DB;if(!db?.prepare)return j(503,{ok:false,message:'Database not configured.'});
 const url=new URL(request.url),id=url.searchParams.get('id'),method=request.method;
 try{
 if(method==='GET'){
  if(id){const r=await db.prepare('SELECT id,candidate,interview_date,interviewer,total_score,recommendation,evaluation_json,created_at FROM candidate_evaluations WHERE id=?').bind(id).first();if(!r)return j(404,{ok:false,message:'Candidate not found.'});return j(200,{ok:true,record:{...r,evaluation:JSON.parse(r.evaluation_json)}})}
  const rows=await db.prepare('SELECT id,candidate,interview_date,interviewer,total_score,recommendation,created_at FROM candidate_evaluations ORDER BY created_at DESC LIMIT 250').all();return j(200,{ok:true,records:rows.results||[]});
 }
 if(method==='POST'||method==='PUT'){
  if(Number(request.headers.get('content-length')||0)>65000)return j(413,{ok:false,message:'Too much data.'});
  const b=await request.json();const final=b.status==='final';const total=validate(b,final);if(total===null)return j(400,{ok:false,message:'Please provide candidate, date, and valid scoring fields.'});
  const identifier=method==='PUT'?id:crypto.randomUUID();if(method==='PUT'&&!id)return j(400,{ok:false,message:'Missing candidate record ID.'});
  const old=method==='PUT'?await db.prepare('SELECT evaluation_json FROM candidate_evaluations WHERE id=?').bind(id).first():null;if(method==='PUT'&&!old)return j(404,{ok:false,message:'Record not found.'});
  const payload={...b,status:final?'final':'draft',schema_version:1,updated_at:new Date().toISOString()};
  const pdf=''; // Download uses live form print template; preserve prior PDF on edits.
  if(method==='POST')await db.prepare("INSERT INTO candidate_evaluations(id,candidate,interview_date,interviewer,total_score,recommendation,evaluation_json,pdf_base64,email_state) VALUES(?,?,?,?,?,?,?,?,?)").bind(identifier,safe(b.candidate),b.date,safe(b.interviewer||'Andrea'),total,safe(b.recommendation||'Draft'),JSON.stringify(payload),pdf,'draft').run();
  else await db.prepare('UPDATE candidate_evaluations SET candidate=?,interview_date=?,interviewer=?,total_score=?,recommendation=?,evaluation_json=? WHERE id=?').bind(safe(b.candidate),b.date,safe(b.interviewer||'Andrea'),total,safe(b.recommendation||'Draft'),JSON.stringify(payload),identifier).run();
  return j(200,{ok:true,id:identifier,total,status:payload.status});
 }
 return j(405,{ok:false,message:'Method not allowed.'});
 }catch(e){console.error('candidate-records',e);return j(500,{ok:false,message:'Candidate record request failed.'})}
}
