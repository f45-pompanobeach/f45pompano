import { sendGatewayEmail } from '../leads/_email_gateway.js';

const allowed=[
 ['English & Spanish Communication',4,20],['Sales Skills',6,30],
 ['Organization & Independence',4,20],['Customer Service & Member Retention',3,15],
 ['Additional Skills & Role Fit',3,15]
];
const j=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const trim=(v,max=2000)=>String(v??'').trim().slice(0,max);

export async function onRequestPost({request,env}){
 if(!env.CANDIDATE_EVAL_ACCESS_CODE||String(env.CANDIDATE_EVAL_ACCESS_CODE).length<6)return j(503,{ok:false,message:'Form access is not configured. Contact the studio owner.'});
 if(Number(request.headers.get('content-length')||0)>45000)return j(413,{ok:false,message:'Submission too large.'});
 let body;try{body=await request.json()}catch{return j(400,{ok:false,message:'Invalid submission.'})}
 if(typeof body?.code!=='string'||body.code!==env.CANDIDATE_EVAL_ACCESS_CODE)return j(403,{ok:false,message:'Incorrect interviewer access code.'});
 if(!Array.isArray(body.sections)||body.sections.length!==allowed.length)return j(400,{ok:false,message:'Missing score sections.'});
 const candidate=trim(body.candidate,120),date=trim(body.date,16);
 if(candidate.length<2||!/^\d{4}-\d{2}-\d{2}$/.test(date))return j(400,{ok:false,message:'Candidate name and interview date are required.'});
 let total=0;const entries=[];
 for(let i=0;i<allowed.length;i++){
  const [name,count,max]=allowed[i],section=body.sections[i];
  if(section?.name!==name||section?.max!==max||!Array.isArray(section.ratings)||section.ratings.length!==count)return j(400,{ok:false,message:'Invalid scoring criteria.'});
  let sectionScore=0;
  for(const r of section.ratings){if(!r||!Number.isInteger(r.score)||r.score<1||r.score>5||!trim(r.label,160))return j(400,{ok:false,message:'All criteria must be scored 1–5.'});sectionScore+=r.score;entries.push(['  '+trim(r.label,160),String(r.score)+'/5'+(r.notes?' — '+trim(r.notes,1000):'')])}
  total+=sectionScore;entries.push([name,sectionScore+'/'+max]);
 }
 if(!trim(body.reason,3000)||!trim(body.recommendation)||!trim(body.trust)||!trim(body.english)||!trim(body.spanish)||!trim(body.preference)||!trim(body.schedule)||!trim(body.weekend))return j(400,{ok:false,message:'Complete all required qualifications and your recommendation.'});
 const fields={Candidate:candidate,'Interview Date':date,Interviewer:trim(body.interviewer,80)||'Andrea','Interview Duration (min)':trim(body.duration,10),...Object.fromEntries(entries),'TOTAL SCORE':total+'/100','English fluency':trim(body.english),'Spanish fluency':trim(body.spanish),'Work preference':trim(body.preference),'Flexible blocks':trim(body.schedule),'Weekend support':trim(body.weekend),'Schedule notes':trim(body.schedule_notes),'Best sales example':trim(body.best,3000),'Sales weakness':trim(body.weakness,3000),'Language observations':trim(body.language_notes,3000),'Organization observations':trim(body.organization_notes,3000),'Strengths':trim(body.strengths,3000),'Concerns':trim(body.concerns,3000),'Recommendation':trim(body.recommendation),'Trust to work independently':trim(body.trust),'Reason for recommendation':trim(body.reason,3000)};
 try{
  const ref=crypto.randomUUID();
  const receipt=await sendGatewayEmail(env,{idempotencyKey:'candidate-eval-'+ref,to:trim(env.CANDIDATE_EVAL_NOTIFY_TO,200)||'joe.karakunnel@gmail.com',subject:'F45 Candidate Evaluation: '+candidate+' — '+total+'/100',fields,priority:'standard'});
  if(!receipt.accepted)return j(503,{ok:false,message:'Email delivery is not configured. No confirmation was issued.'});
  return j(200,{ok:true,reference:ref});
 }catch(error){console.error('Candidate evaluation submission failed',String(error?.message||error));return j(502,{ok:false,message:'Email service unavailable. Please try again.'})}
}
export function onRequest(){return j(405,{ok:false,message:'Method not allowed.'})}
