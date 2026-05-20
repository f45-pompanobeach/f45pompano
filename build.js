const fs = require("fs");
const path = require("path");

const partnerTemplate = fs.readFileSync("template-partner.html", "utf8");
const genericTemplate = fs.readFileSync("template-generic.html", "utf8");

const dataDir = "data";
const distDir = "dist";

// Shared values
const shared = JSON.parse(
  fs.readFileSync(path.join(dataDir, "shared.json"), "utf8")
);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// COPY STATIC ASSETS (video/photos)
if (fs.existsSync("public")) {
  fs.cpSync("public", distDir, { recursive: true });
}

// Default homepage
let genericHtml = genericTemplate;

for (const [key, value] of Object.entries(shared)) {
  genericHtml = genericHtml.replaceAll(`{{${key}}}`, value);
}

fs.writeFileSync(path.join(distDir, "index.html"), genericHtml);

// Partner pages
for (const file of fs.readdirSync(dataDir)) {

  if (file === "shared.json") continue;

  if (!file.endsWith(".json")) continue;

  const partner = JSON.parse(
    fs.readFileSync(path.join(dataDir, file), "utf8")
  );

  const data = {
    ...shared,
    ...partner
  };

  let html = partnerTemplate;

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  fs.writeFileSync(path.join(distDir, `${data.slug}.html`), html);

  console.log(`Generated ${data.slug}.html`);
}
