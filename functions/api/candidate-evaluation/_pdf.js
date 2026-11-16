// Lightweight server-side PDF report matching the sections of the F45 100-point scorecard.
// No third-party runtime or external PDF service required.
const ascii=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/[\u2022]/g,'-').replace(/[^\x20-\x7e]/g,'?');
const esc=s=>ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
function wrap(value,width=94){
 const out=[];for(const paragraph of String(value??'').split(/\r?\n/)){
  let line='';for(let word of ascii(paragraph).split(/\s+/)){
   if(!word)continue;
   if((line+' '+word).length>width&&line){out.push(line);line='';}
   while(word.length>width){out.push(word.slice(0,width));word=word.slice(width)}
   line+=(line?' ':'')+word;
  }out.push(line);
 }return out;
}
export function candidatePdf(body,total){
 const pages=[];let lines=[];let y=750;
 function flush(){if(lines.length)pages.push(lines.join('\n'));lines=[];y=750}
 function line(value='',size=9,bold=false){
  for(const part of wrap(value,size>=12?76:100)){
   if(y<55)flush();
   lines.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf 48 '+y+' Td ('+esc(part)+') Tj ET');
   y-=size>=12?19:13;
  }
 }
 function space(n=8){y-=n;if(y<55)flush()}
 function heading(s){space(8);line(s,12,true);space(3)}
 line('F45 TRAINING POMPANO BEACH  |  INTERNAL USE',10,true);
 heading('CANDIDATE EVALUATION FORM  -  100 POINT SCORECARD');
 line('Candidate: '+body.candidate+'     Date: '+body.date+'     Interviewer: '+(body.interviewer||'Andrea'));
 line('Duration (minutes): '+(body.duration||'Not specified')+'     Overall: '+total+' / 100',11,true);
 line('1 Poor  |  2 Weak  |  3 Meets basic  |  4 Strong  |  5 Excellent');
 for(const [i,section] of body.sections.entries()){
  const subtotal=section.ratings.reduce((sum,r)=>sum+r.score,0);
  heading((i+1)+'. '+section.name+'  -  '+subtotal+' / '+section.max);
  for(const r of section.ratings){
   line(r.label+'   '+r.score+' / 5',9,true);
   if(r.notes)line('Evidence: '+r.notes,8);
  }
 }
 heading('REQUIRED QUALIFICATIONS AND SCHEDULING');
 for(const [label,key] of [['English fluency','english'],['Spanish fluency','spanish'],['Work preference','preference'],['Flexible working blocks','schedule'],['Weekend support','weekend'],['Schedule concerns','schedule_notes']])line(label+': '+(body[key]||'-'));
 heading('INTERVIEW OBSERVATIONS');
 for(const [label,key] of [['Best sales example','best'],['Sales weakness','weakness'],['Language observations','language_notes'],['Organization observations','organization_notes'],['Strengths','strengths'],['Concerns','concerns']]){
  line(label+':',9,true);line(body[key]||'Not provided');
 }
 heading('OVERALL SCORE AND RECOMMENDATION');
 line('TOTAL: '+total+' / 100',12,true);
 line('Communication: '+body.sections[0].ratings.reduce((a,r)=>a+r.score,0)+'/20  |  Sales: '+body.sections[1].ratings.reduce((a,r)=>a+r.score,0)+'/30');
 line('Organization: '+body.sections[2].ratings.reduce((a,r)=>a+r.score,0)+'/20  |  Service: '+body.sections[3].ratings.reduce((a,r)=>a+r.score,0)+'/15  |  Additional: '+body.sections[4].ratings.reduce((a,r)=>a+r.score,0)+'/15');
 line('Recommendation: '+body.recommendation);
 line('Trust to work independently: '+body.trust);
 line('Reason:',9,true);line(body.reason);
 flush();
 const objs=[null];const add=x=>(objs.push(x),objs.length-1);
 const catalog=add('');const pagesRef=add('');
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pageRefs=[];
 for(let i=0;i<pages.length;i++){
  const stream=pages[i];const contentRef=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
  const pageRef=add('<< /Type /Page /Parent '+pagesRef+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+font+' 0 R /F2 '+bold+' 0 R >> >> /Contents '+contentRef+' 0 R >>');
  pageRefs.push(pageRef);
 }
 objs[pagesRef]='<< /Type /Pages /Kids ['+pageRefs.map(i=>i+' 0 R').join(' ')+'] /Count '+pageRefs.length+' >>';
 objs[catalog]='<< /Type /Catalog /Pages '+pagesRef+' 0 R >>';
 let pdf='%PDF-1.4\n';const offsets=[0];
 for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
 const xref=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objs.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+objs.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return btoa(pdf);
}
