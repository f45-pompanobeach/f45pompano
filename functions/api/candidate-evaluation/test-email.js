import { sendGatewayEmail } from '../leads/_email_gateway.js';

// Temporary sample email route. Does not save or alter candidate records.
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 const origin=new URL(request.url).origin;
 if(request.headers.get('origin')!==origin)return json(403,{ok:false,message:'Open the evaluation page to send a sample.'});
 const destination='joe.karakunnel@gmail.com';
 const scoreRows=[['English & Spanish Communication','18 / 20'],['Sales Skills','25 / 30'],['Organization & Independence','17 / 20'],['Customer Service & Member Retention','13 / 15'],['Additional Skills & Role Fit','13 / 15']];
 const rows=scoreRows.map(([name,score])=>'<tr><td style="padding:10px 12px;border-bottom:1px solid #e8eaf0;color:#303744">'+name+'</td><td style="padding:10px 12px;border-bottom:1px solid #e8eaf0;text-align:right;font-weight:700;color:#18283e">'+score+'</td></tr>').join('');
 const info=(name,value)=>'<tr><td style="padding:7px 0;color:#657084;width:150px;vertical-align:top">'+name+'</td><td style="padding:7px 0;color:#202b3c">'+value+'</td></tr>';
 const html='<div style="margin:0;background:#f5f6f9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#202b3c"><div style="max-width:610px;margin:auto;background:#fff;border:1px solid #e4e7ed;border-radius:10px;overflow:hidden">'
 +'<div style="padding:23px 28px;background:#17263a;color:#fff"><div style="font-size:12px;letter-spacing:1.5px;font-weight:700;color:#d6e1ef">F45 POMPANO BEACH</div><div style="font-size:22px;font-weight:700;margin-top:9px">Candidate Evaluation</div></div>'
 +'<div style="padding:24px 28px"><div style="font-size:22px;font-weight:700">Maria Rodriguez</div><div style="font-size:13px;color:#657084;margin-top:5px">Interviewed November 16, 2026 · Andrea</div>'
 +'<div style="margin-top:22px;padding:18px;background:#f0f3f7;border-radius:8px;text-align:center"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#657084">OVERALL SCORE</div><div style="font-size:36px;font-weight:700;color:#17263a;margin-top:5px">86<span style="font-size:17px;color:#657084"> / 100</span></div><div style="margin-top:7px;font-size:14px;font-weight:700">Strong candidate — advance</div></div>'
 +'<h3 style="font-size:15px;margin:26px 0 8px">Score breakdown</h3><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">'+rows+'</table>'
 +'<h3 style="font-size:15px;margin:25px 0 8px">Interview summary</h3><table role="presentation" style="width:100%;font-size:13px;border-collapse:collapse">'
 +info('English','Meets requirements')+info('Spanish','Exceeds requirements')+info('Availability','Part-time · Flexible weekdays')+info('Weekend support','Yes, occasionally')+info('Independent work','Yes')+'</table>'
 +'<h3 style="font-size:15px;margin:24px 0 8px">Strengths</h3><p style="font-size:13px;line-height:1.6;margin:0">Confident communicator, strong customer service background, and comfortable handling sales objections. Organized and quick to learn new systems.</p>'
 +'<h3 style="font-size:15px;margin:20px 0 8px">Concerns</h3><p style="font-size:13px;line-height:1.6;margin:0">Limited experience with fitness memberships and may need initial coaching on closing techniques.</p>'
 +'<h3 style="font-size:15px;margin:20px 0 8px">Recommendation notes</h3><p style="font-size:13px;line-height:1.6;margin:0">Strong candidate for the role. Recommend moving forward to the final interview.</p>'
 +'<div style="margin-top:25px;border-top:1px solid #e4e7ed;padding-top:15px;font-size:12px;color:#657084">SAMPLE ONLY — Fictional candidate. No database record created.</div></div></div></div>';
 const plain=['SAMPLE ONLY — F45 Candidate Evaluation','Maria Rodriguez | November 16, 2026 | Andrea','Overall score: 86 / 100','Recommendation: Strong candidate — advance',...scoreRows.map(([n,v])=>n+': '+v),'English: Meets requirements','Spanish: Exceeds requirements','Strengths: Confident communicator, organized and coachable.','Concerns: Limited fitness membership experience.','Recommendation: Advance to final interview.','No database record created.'].join('\n');
 try{
  const receipt=await sendGatewayEmail(env,{idempotencyKey:'eval-sample-'+crypto.randomUUID(),to:destination,subject:'[SAMPLE] F45 Candidate Evaluation: Maria Rodriguez — 86/100',fields:{Sample:'Candidate evaluation'},htmlOverride:html,textOverride:plain,priority:'standard'});
  if(!receipt.accepted)return json(503,{ok:false,message:'Email gateway not configured.'});
  return json(200,{ok:true,message:'Sample email queued for '+destination+'.'});
 }catch(error){console.error('Sample candidate email failed',String(error?.message||error));return json(502,{ok:false,message:'Email gateway could not accept the sample. Please try again.'})}
}
export function onRequest(){return json(405,{ok:false,message:'Method not allowed.'})}
