// Post-build social-preview artwork only. Never modify page content or forms.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'dist');
const image = 'https://f45pompano.com/f45-pompano-share-v1.jpg';
let changed = 0;
function visit(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const p = path.join(folder, item.name);
    if (item.isDirectory()) { visit(p); continue; }
    if (!item.name.endsWith('.html')) continue;
    let html = fs.readFileSync(p, 'utf8');
    if (!html.includes('og:image')) continue;
    const before = html;
    for (const property of ['og:image', 'og:image:secure_url']) {
      html = html.replace(new RegExp('(<meta\\s+property="' + property + '"\\s+content=")[^"]*(")', 'gi'), '$1' + image + '$2');
    }
    html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/gi, '$1' + image + '$2');
    html = html.replace(/(<meta\s+property="og:image:type"\s+content=")[^"]*(")/gi, '$1image/jpeg$2');
    if (html !== before) { fs.writeFileSync(p, html); changed++; }
  }
}
visit(root);
console.log('Updated social preview images in ' + changed + ' generated HTML files.');
