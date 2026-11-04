/* Build-only cleanup for all generated landing/partner pages with a lead form.
 * Remove redundant mid-page promotional strips and apply consistent checkbox
 * styling. Keep the hero offer, forms, required/optional consent fields,
 * Mindbody checkout, page tracking, and navigation untouched. */
const fs=require('fs');
const path=require('path');
const dist=path.join(__dirname,'..','dist');
const leadFormMarker='id="partnerLeadForm"';
const barStart='<div class="mid-cta-bar">';
const css='/partner-form-checkboxes.css?v=1';

function removeRedundantStrips(html){
  let removed=0;
  while(true){
    const start=html.indexOf(barStart);
    if(start<0)break;
    const token=/<\/?div\b[^>]*>/gi;
    token.lastIndex=start;
    let depth=0,end=-1,match;
    while((match=token.exec(html))){
      depth+=/^<\/div/i.test(match[0])?-1:1;
      if(depth===0){end=token.lastIndex;break;}
    }
    if(end<0)throw Error('Unclosed mid-page CTA div');
    html=html.slice(0,start)+html.slice(end);
    removed++;
  }
  // Remove obsolete non-rendering anchor comments left by the removed bars.
  html=html.replace(/<!-- MID-PAGE CTA -->\s*/g,'');
  return {html,removed};
}

let pages=0,removedTotal=0;
function visit(folder){
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    const target=path.join(folder,entry.name);
    if(entry.isDirectory()){visit(target);continue;}
    if(!entry.name.endsWith('.html'))continue;
    let html=fs.readFileSync(target,'utf8');
    if(!html.includes(leadFormMarker))continue;
    const processed=removeRedundantStrips(html);
    html=processed.html;
    if(!html.includes(css)){
      if(!html.includes('</head>'))throw Error('Lead page missing head: '+target);
      html=html.replace('</head>','<link rel="stylesheet" href="'+css+'">\n</head>');
    }
    for(const id of ['partnerTermsPrivacy','partnerEligibilityConfirm','partnerSmsConsent']){
      if(!html.includes('id="'+id+'"'))throw Error('Lead page lost '+id+': '+target);
    }
    if(html.includes(barStart))throw Error('Redundant CTA not removed: '+target);
    fs.writeFileSync(target,html);
    pages++;
    removedTotal+=processed.removed;
  }
}
visit(dist);
if(pages===0||removedTotal===0)
  throw Error('No lead-form pages or redundant CTA strips found. Check the template.');
console.log('Polished '+pages+' landing/partner HTML files; removed '+removedTotal+
  ' redundant trial strips; standardized checkbox styles.');
