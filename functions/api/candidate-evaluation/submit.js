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

 // Email is a concise, readable summary; complete source data and PDF remain in D1.
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sectionRows=body.sections.map(section=>{
  const score=section.ratings.reduce((sum,r)=>sum+r.score,0);
  return '<tr><td style="padding:10px 12px;border-bottom:1px solid #e8eaf0;color:#303744">'+escapeHtml(section.name)+'</td><td style="padding:10px 12px;border-bottom:1px solid #e8eaf0;text-align:right;font-weight:700;color:#18283e">'+score+' / '+section.max+'</td></tr>';
 }).join('');
 const fullRows=body.sections.map((section,index)=>'<h3 style="font-size:20px;color:#17263a;margin:24px 0 10px">'+escapeHtml((index+1)+'. '+section.name)+'</h3>'+section.ratings.map(r=>'<div style="padding:9px 0;border-bottom:1px solid #e4e7ed"><strong style="font-size:13px">'+escapeHtml(r.label)+' — '+r.score+'/5</strong><div style="font-size:12px;color:#657084;white-space:pre-wrap;margin-top:4px">'+escapeHtml(r.notes||'No notes')+'</div></div>').join('')).join('');
 const fullText=body.sections.map((section,index)=>(index+1)+'. '+section.name+'\\n'+section.ratings.map(r=>r.label+': '+r.score+'/5 | '+(r.notes||'No notes')).join('\\n')).join('\\n\\n');
 const extra=[['Interview duration',(body.duration||'Not specified')+' minutes'],['Schedule concerns',body.schedule_notes],['Best sales role-play response',body.best],['Biggest sales weakness',body.weakness],['Language observations',body.language_notes],['Organization and independence evidence',body.organization_notes],['Strengths and coachability',body.strengths],['Concerns and training needs',body.concerns],['Recommendation',body.recommendation],['Trust independently',body.trust],['Reason for recommendation',body.reason]];
 const info=(label,value)=>'<tr><td style="padding:7px 0;color:#657084;width:150px;vertical-align:top">'+escapeHtml(label)+'</td><td style="padding:7px 0;color:#202b3c">'+escapeHtml(value||'—')+'</td></tr>';
 const html='<div style="margin:0;background:#f5f6f9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#202b3c"><div style="max-width:610px;margin:auto;background:#fff;border:1px solid #e4e7ed;border-radius:10px;overflow:hidden">'
  +'<div style="padding:23px 28px;background:#17263a;color:#fff"><div style="font-size:12px;letter-spacing:1.5px;font-weight:700;color:#d6e1ef">F45 POMPANO BEACH</div><div style="font-size:22px;font-weight:700;margin-top:9px">Candidate Evaluation</div></div>'
  +'<div style="padding:24px 28px"><div style="font-size:22px;font-weight:700">'+escapeHtml(candidate)+'</div><div style="font-size:13px;color:#657084;margin-top:5px">Interviewed '+escapeHtml(date)+' · '+escapeHtml(body.interviewer||'Andrea')+'</div>'
  +'<div style="margin-top:22px;padding:18px;background:#f0f3f7;border-radius:8px;text-align:center"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#657084">OVERALL SCORE</div><div style="font-size:36px;font-weight:700;color:#17263a;margin-top:5px">'+total+'<span style="font-size:17px;color:#657084"> / 100</span></div><div style="margin-top:7px;font-size:14px;font-weight:700">'+escapeHtml(body.recommendation)+'</div></div>'
  +'<h3 style="font-size:15px;margin:26px 0 8px">Score breakdown</h3><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">'+sectionRows+'</table>'
  +'<h3 style="font-size:15px;margin:25px 0 8px">Interview summary</h3><table role="presentation" style="width:100%;font-size:13px;border-collapse:collapse">'
  +info('English',body.english)+info('Spanish',body.spanish)+info('Availability',body.preference+' · '+body.schedule)+info('Weekend support',body.weekend)+info('Independent work',body.trust)+'</table>'
  +'<h3 style="font-size:18px;margin:25px 0 8px">All individual scores and evidence</h3>'+fullRows+'<h3 style="font-size:18px;margin:25px 0 8px">Complete interview details</h3><table role="presentation" style="width:100%;font-size:13px;border-collapse:collapse">'+extra.map(([k,v])=>info(k,v)).join('')+'</table>'+'<h3 style="font-size:15px;margin:24px 0 8px">Strengths</h3><p style="font-size:13px;line-height:1.6;white-space:pre-wrap;margin:0">'+escapeHtml(body.strengths||'Not specified')+'</p>'
  +'<h3 style="font-size:15px;margin:20px 0 8px">Concerns</h3><p style="font-size:13px;line-height:1.6;white-space:pre-wrap;margin:0">'+escapeHtml(body.concerns||'Not specified')+'</p>'
  +'<h3 style="font-size:15px;margin:20px 0 8px">Recommendation notes</h3><p style="font-size:13px;line-height:1.6;white-space:pre-wrap;margin:0">'+escapeHtml(body.reason)+'</p>'
  +'<div style="margin-top:25px;border-top:1px solid #e4e7ed;padding-top:15px;font-size:12px;color:#657084">Full evaluation, individual criterion scores, all notes, and a PDF copy are saved in the candidate evaluation database.<br>Reference: '+escapeHtml(ref)+'</div></div></div></div>';
 const text=['F45 Pompano Beach | Candidate Evaluation',candidate+' | '+date,'Overall: '+total+'/100 | '+body.recommendation,'',...body.sections.map(section=>section.name+': '+section.ratings.reduce((sum,r)=>sum+r.score,0)+'/'+section.max),'','INDIVIDUAL SCORES AND NOTES',fullText,'English: '+body.english,'Spanish: '+body.spanish,...extra.map(([k,v])=>k+': '+(v||'-')),'Strengths: '+(body.strengths||'-'),'Concerns: '+(body.concerns||'-'),'Recommendation: '+body.reason,'','Full evaluation and PDF are saved in D1.','Reference: '+ref].join('\\n');
 const fields={Candidate:candidate,Score:total+'/100',Recommendation:body.recommendation};
 try{
  const receipt=await sendGatewayEmail(env,{idempotencyKey:'candidate-eval-'+ref,to:trim(env.CANDIDATE_EVAL_NOTIFY_TO,200)||'joe.karakunnel@gmail.com',subject:'F45 Candidate Evaluation: '+candidate+' - '+total+'/100',fields,priority:'standard',htmlOverride:html,textOverride:text});
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
