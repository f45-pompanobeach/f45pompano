import { sendGatewayEmail } from '../leads/_email_gateway.js';
import { candidatePdf } from './_pdf.js';

const allowed=[
 ['English & Spanish Communication',4,20],['Sales Skills',6,30],
 ['Organization & Independence',4,20],['Customer Service & Member Retention',3,15],
 ['Additional Skills & Role Fit',3,15]
];
const j=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const trim=(v,max=2000)=>String(v??'').trim().slice(0,max);

export async function onRequestPost({request,env}){
 if(Number(request.headers.get('content-length')||0)>45000)return j(413,{ok:false,message:'Submission too large.'});
 let body;try{body=await request.json()}catch{return j(400,{ok:false,message:'Invalid submission.'})}
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

 // Save the full evaluation and PDF BEFORE attempting email; email failures must not lose data.
 const db=env.CANDIDATE_EVAL_DB;
 if(!db?.prepare)return j(503,{ok:false,message:'Evaluation storage is not configured. Nothing submitted; please contact the studio owner.'});
 const ref=crypto.randomUUID();
 let pdf;
 try{pdf=candidatePdf(body,total)}catch(error){console.error('PDF creation failed',error);return j(500,{ok:false,message:'Could not generate PDF; evaluation not submitted.'})}
 try{
  await db.prepare('INSERT INTO candidate_evaluations(id,candidate,interview_date,interviewer,total_score,recommendation,evaluation_json,pdf_base64,email_state) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(ref,candidate,date,trim(body.interviewer,80)||'Andrea',total,trim(body.recommendation),JSON.stringify(body),pdf,'pending').run();
 }catch(error){console.error('Evaluation database save failed',error);return j(503,{ok:false,message:'Could not save evaluation. No email sent; please retry.'})}
 const safeName=candidate.replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,65)||'Candidate';
 const fields={Candidate:candidate,'Interview date':date,'Total score':total+'/100',Recommendation:trim(body.recommendation),'Record ID':ref,'Report':'Complete scores and interview notes are attached as a PDF.'};
 try{
  const receipt=await sendGatewayEmail(env,{idempotencyKey:'candidate-eval-'+ref,to:trim(env.CANDIDATE_EVAL_NOTIFY_TO,200)||'joe.karakunnel@gmail.com',subject:'F45 Candidate Evaluation: '+candidate+' - '+total+'/100',fields,priority:'standard',attachments:[{filename:'F45_Evaluation_'+safeName+'.pdf',contentType:'application/pdf',content:pdf}]});
  if(!receipt.accepted)throw Error('gateway did not accept');
  await db.prepare("UPDATE candidate_evaluations SET email_state='accepted',email_gateway_id=? WHERE id=?").bind(receipt.id||null,ref).run().catch(error=>console.error('Email status update failed',error));
  return j(200,{ok:true,saved:true,emailed:true,reference:ref});
 }catch(error){
  console.error('Candidate evaluation email failed after database save',String(error?.message||error));
  await db.prepare("UPDATE candidate_evaluations SET email_state='failed' WHERE id=?").bind(ref).run().catch(()=>{});
  return j(200,{ok:true,saved:true,emailed:false,reference:ref,message:'Evaluation and PDF saved securely, but email was not accepted. Contact the studio owner with the reference number.'});
 }
}
export function onRequest(){return j(405,{ok:false,message:'Method not allowed.'})}
