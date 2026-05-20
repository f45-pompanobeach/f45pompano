const fs = require("fs");
const path = require("path");

const template = fs.readFileSync("template.html", "utf8");

const dataDir = "data";
const distDir = "dist";

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith(".json")) continue;

  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));

  let html = template;

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  fs.writeFileSync(path.join(distDir, `${data.slug}.html`), html);

  if (data.slug === "foxtail") {
    fs.writeFileSync(path.join(distDir, "index.html"), html);
  }

  console.log(`Generated ${data.slug}.html`);
}
