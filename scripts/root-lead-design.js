/* Main website lead form uses DOM-injected markup, unlike partner pages.
 * Apply the approved shared design via a separate, scoped adapter.
 * Preserve the existing form, email, consent and checkout handlers. */
const fs=require('fs');
const path=require('path');
const target=path.join(__dirname,'..','dist','index.html');
let html=fs.readFileSync(target,'utf8');
for(const marker of ['<body>','<header class="screenshot-nav">','    </nav>\n  </header>',
  'rootLeadCapture','root-hero-lead-overlay','id=\\"partnerLeadForm\\"']){
  // rootLeadCapture is not emitted as a symbol; the markup is JSON-encoded
  // in an inline script. Validate the generated bootstrap marker instead.
  if(marker==='rootLeadCapture')continue;
  if(!html.includes(marker))throw Error('Main site adapter missing '+marker);
}
html=html.replace('<body>','<body class="lead-form-pilot root-lead-design">');
html=html.replace('<header class="screenshot-nav">',
  '<header class="screenshot-nav">\n' +
  '    <div class="lead-pilot-brand"><img src="/f45-logo-transparent-v2.svg" alt="F45 Training Pompano Beach"></div>');
html=html.replace('    </nav>\n  </header>',
  '    </nav>\n' +
  '    <div class="lead-pilot-nav-actions"><button class="lead-pilot-nav-book" type="button">Unlock Trial</button></div>\n' +
  '  </header>\n' +
  '  <div class="lead-pilot-mobile-bar" hidden><button type="button" class="lead-pilot-mobile-book">↑ Unlock Trial</button></div>');
html=html.replace('</head>',
  '<link rel="stylesheet" href="/lead-form-pilot.css?v=3">\n' +
  '<link rel="stylesheet" href="/partner-form-checkboxes.css?v=1">\n' +
  '<link rel="stylesheet" href="/root-lead-design.css?v=1">\n</head>');
html=html.replace('</body>',
  '<script defer src="/root-lead-design.js?v=1"></script>\n' +
  '<script defer src="/lead-form-pilot.js?v=3"></script>\n</body>');
fs.writeFileSync(target,html);
console.log('Updated main website lead-form presentation; original submission logic unchanged.');
