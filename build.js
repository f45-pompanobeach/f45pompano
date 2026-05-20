const fs = require("fs");
const path = require("path");

const partnerTemplate = fs.readFileSync(
  "template-partner.html",
  "utf8"
);

const genericTemplate = fs.readFileSync(
  "template-generic.html",
  "utf8"
);

const dataDir = "data";
const distDir = "dist";

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// GENERIC HOMEPAGE
fs.writeFileSync(
  path.join(distDir, "index.html"),
  genericTemplate
);

// PARTNER PAGES
for (const file of fs.readdirSync(dataDir)) {

  if (!file.endsWith(".json")) continue;

  const data = JSON.parse(
    fs.readFileSync(path.join(dataDir, file), "utf8")
  );

  let html = partnerTemplate;

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  fs.writeFileSync(
    path.join(distDir, `${data.slug}.html`),
    html
  );

  console.log(`Generated ${data.slug}.html`);
}
