const fs = require("fs");
const path = require("path");

const partnerTemplate = fs.readFileSync("template-partner.html", "utf8");
const genericTemplate = fs.readFileSync("template-generic.html", "utf8");

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

const redirectLines = [];

// Default homepage
const genericData = {
  ...shared,
  ...generic
};

fs.writeFileSync(
  path.join(distDir, "index.html"),
  render(genericTemplate, genericData)
);

// Partner pages — flat .html files only
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

  fs.writeFileSync(
    path.join(distDir, `${partnerData.slug}.html`),
    render(partnerTemplate, partnerData)
  );

  // Redirect clean URLs to the flat .html page so relative image paths still work.
  redirectLines.push(`/${partnerData.slug} /${partnerData.slug}.html 301`);
  redirectLines.push(`/${partnerData.slug}/ /${partnerData.slug}.html 301`);

  console.log(`Generated ${partnerData.slug}.html`);
}

fs.writeFileSync(
  path.join(distDir, "_redirects"),
  `${redirectLines.join("\n")}\n`
);
