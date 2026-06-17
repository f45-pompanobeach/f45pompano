const fs = require("fs");
const path = require("path");

const partnerTemplate = fs.readFileSync("template-partner.html", "utf8");
const genericTemplate = fs.readFileSync("template-generic.html", "utf8");
const metaTemplate = fs.existsSync("template-meta.html")
  ? fs.readFileSync("template-meta.html", "utf8")
  : partnerTemplate;

const dataDir = "data";
const distDir = "dist";

const shared = JSON.parse(
  fs.readFileSync(path.join(dataDir, "shared.json"), "utf8")
);

const generic = JSON.parse(
  fs.readFileSync(path.join(dataDir, "generic.json"), "utf8")
);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

if (fs.existsSync("public")) {
  fs.cpSync("public", distDir, { recursive: true });
}

function render(template, data) {
  let html = template;

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, String(value));
  }

  return html;
}

// Default homepage
const genericData = {
  ...shared,
  ...generic
};

fs.writeFileSync(
  path.join(distDir, "index.html"),
  render(genericTemplate, genericData)
);

// Partner pages
for (const file of fs.readdirSync(dataDir)) {
  if (file === "shared.json") continue;
  if (file === "generic.json") continue;
  if (!file.endsWith(".json")) continue;

  const partner = JSON.parse(
    fs.readFileSync(path.join(dataDir, file), "utf8")
  );

  const partnerData = {
    ...shared,
    ...partner
  };

  const renderedPartnerPage = render(
    file === "meta.json" ? metaTemplate : partnerTemplate,
    partnerData
  );

  fs.writeFileSync(
    path.join(distDir, `${partnerData.slug}.html`),
    renderedPartnerPage
  );

  const partnerPageDir = path.join(distDir, partnerData.slug);
  fs.mkdirSync(partnerPageDir, { recursive: true });

  fs.writeFileSync(
    path.join(partnerPageDir, "index.html"),
    renderedPartnerPage
  );

  console.log(`Generated ${partnerData.slug}.html`);
}
