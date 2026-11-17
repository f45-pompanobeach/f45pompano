import { sendGatewayEmail } from '../leads/_email_gateway.js';
// Candidate record management. Access must be restricted at Cloudflare edge to authorized staff.
const j=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const safe=s=>String(s??'').trim().slice(0,3000);
const allowed=[['English & Spanish Communication',4,20],['Sales Skills',6,30],['Organization & Independence',4,20],['Customer Service & Member Retention',3,15],['Additional Skills & Role Fit',3,15]];
function validate(b,final){if(!b||typeof b!=='object'||!Array.isArray(b.sections)||b.sections.length!==5||!safe(b.candidate)||!/^\d{4}-\d{2}-\d{2}$/.test(b.date||''))return null;let total=0;for(let i=0;i<5;i++){const [name,count,max]=allowed[i],s=b.sections[i];if(s?.name!==name||s?.max!==max||s.ratings?.length!==count)return null;for(const r of s.ratings){if(r.score===null||r.score===0||r.score===''){if(final)return null;continue}if(!Number.isInteger(r.score)||r.score<1||r.score>5)return null;total+=r.score}}if(final&&(!b.reason||!b.recommendation||!b.trust||!b.english||!b.spanish||!b.preference||!b.schedule||!b.weekend))return null;return total}
const flatten=(o)=>{const result={};for(const [k,v] of Object.entries(o||{})){if(['history','schema_version','updated_at','status'].includes(k))continue;if(k==='sections'){for(const sec of v||[])for(const item of sec.ratings||[]){result[sec.name+' / '+item.label+' / Score']=item.score;result[sec.name+' / '+item.label+' / Notes']=item.notes||''}}else if(typeof v!=='object')result[k]=v??''}return result};
const differences=(old,next)=>{const a=flatten(old),b=flatten(next);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>String(a[k]??'')!==String(b[k]??'')).map(k=>({field:k,before:String(a[k]??''),after:String(b[k]??'')}))};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function onRequest({request,env}){

 const db=env.CANDIDATE_EVAL_DB;if(!db?.prepare)return j(503,{ok:false,message:'Database not configured.'});
 const url=new URL(request.url),id=url.searchParams.get('id'),method=request.method;
 try{
 if(method==='GET'){
  if(id){const r=await db.prepare('SELECT id,candidate,interview_date,interviewer,total_score,recommendation,evaluation_json,created_at FROM candidate_evaluations WHERE id=?').bind(id).first();if(!r)return j(404,{ok:false,message:'Candidate not found.'});return j(200,{ok:true,record:{...r,evaluation:JSON.parse(r.evaluation_json)}})}
  const rows=await db.prepare('SELECT id,candidate,interview_date,interviewer,total_score,recommendation,created_at FROM candidate_evaluations ORDER BY created_at DESC LIMIT 250').all();return j(200,{ok:true,records:rows.results||[]});
 }
 if(method==='DELETE'){
  if(!id)return j(400,{ok:false,message:'Missing record ID.'});
  const result=await db.prepare('DELETE FROM candidate_evaluations WHERE id=?').bind(id).run();
  return result.meta?.changes?j(200,{ok:true,deleted:id}):j(404,{ok:false,message:'Record not found.'});
 }
 if(method==='POST'||method==='PUT'){
  if(Number(request.headers.get('content-length')||0)>65000)return j(413,{ok:false,message:'Too much data.'});
  const b=await request.json();const final=b.status==='final';const total=validate(b,final);if(total===null)return j(400,{ok:false,message:'Please provide candidate, date, and valid scoring fields.'});
  const identifier=method==='PUT'?id:crypto.randomUUID();if(method==='PUT'&&!id)return j(400,{ok:false,message:'Missing candidate record ID.'});
  const old=method==='PUT'?await db.prepare('SELECT evaluation_json,created_at FROM candidate_evaluations WHERE id=?').bind(id).first():null;if(method==='PUT'&&!old)return j(404,{ok:false,message:'Record not found.'});
  const previous=old?JSON.parse(old.evaluation_json):null;
  const history=previous?(Array.isArray(previous.history)?previous.history:[{version:1,submitted_at:old.created_at+'Z',interviewer:previous.interviewer||'Andrea',evaluation:{...previous,history:undefined},changes:[]} ]):[];
  const changes=previous?differences(previous,b):[];
  const version=history.length+1;
  const submittedAt=new Date().toISOString();
  if(method==='PUT'&&final&&changes.length)history.push({version,submitted_at:submittedAt,interviewer:safe(b.interviewer||'Andrea'),evaluation:{...b,status:'final'},changes});
  const payload={...b,status:final?'final':'draft',schema_version:1,updated_at:submittedAt,history};
  const pdf=''; // Download uses live form print template; preserve prior PDF on edits.
  if(method==='POST')await db.prepare("INSERT INTO candidate_evaluations(id,candidate,interview_date,interviewer,total_score,recommendation,evaluation_json,pdf_base64,email_state) VALUES(?,?,?,?,?,?,?,?,?)").bind(identifier,safe(b.candidate),b.date,safe(b.interviewer||'Andrea'),total,safe(b.recommendation||'Draft'),JSON.stringify(payload),pdf,'draft').run();
  else await db.prepare('UPDATE candidate_evaluations SET candidate=?,interview_date=?,interviewer=?,total_score=?,recommendation=?,evaluation_json=? WHERE id=?').bind(safe(b.candidate),b.date,safe(b.interviewer||'Andrea'),total,safe(b.recommendation||'Draft'),JSON.stringify(payload),identifier).run();
  let emailed=null;
  if(method==='PUT'&&final&&changes.length){
   const rows=changes.map(c=>'<tr><td style="padding:8px;border-bottom:1px solid #ddd">'+esc(c.field)+'</td><td style="padding:8px;border-bottom:1px solid #ddd">'+esc(c.before)+'</td><td style="padding:8px;border-bottom:1px solid #ddd">'+esc(c.after)+'</td></tr>').join('');
   const html='<h2>Updated Candidate Evaluation: '+esc(b.candidate)+'</h2><p>Version '+version+' · '+esc(b.interviewer||'Andrea')+' · '+esc(submittedAt)+' · '+total+'/100</p><h3>Changes since previous submission</h3><table><tr><th>Field</th><th>Before</th><th>After</th></tr>'+rows+'</table><p>Full evaluation remains available in the candidate evaluation page.</p>';
   try{const receipt=await sendGatewayEmail(env,{idempotencyKey:'candidate-eval-update-'+identifier+'-'+version,to:safe(env.CANDIDATE_EVAL_NOTIFY_TO||'joe.karakunnel@gmail.com'),subject:'F45 Candidate Evaluation UPDATED: '+safe(b.candidate)+' (v'+version+')',fields:{Candidate:safe(b.candidate),Score:total+'/100'},priority:'standard',htmlOverride:html,textOverride:'Candidate evaluation updated: '+b.candidate+'\\nVersion '+version+'\\n'+changes.map(c=>c.field+': '+c.before+' -> '+c.after).join('\\n')});emailed=Boolean(receipt.accepted)}catch(e){console.error('candidate-update-email',e);emailed=false}
  }
  return j(200,{ok:true,id:identifier,total,status:payload.status,version:history.length||1,changeCount:changes.length,emailed});
 }
 return j(405,{ok:false,message:'Method not allowed.'});
 }catch(e){console.error('candidate-records',e);return j(500,{ok:false,message:'Candidate record request failed.'})}
}
