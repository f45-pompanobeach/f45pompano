const fs = require("fs");
const path = require("path");

const partnerTemplate = fs.readFileSync("template-partner.html", "utf8");
const genericTemplate = fs.readFileSync("template-generic.html", "utf8");
const metaTemplate = fs.existsSync("template-meta.html")
  ? fs.readFileSync("template-meta.html", "utf8")
  : partnerTemplate;
const sandsHarborTemplate = fs.existsSync("template-sands-harbor.html")
  ? fs.readFileSync("template-sands-harbor.html", "utf8")
  : partnerTemplate;

const dataDir = "data";
const distDir = "dist";

const shared = JSON.parse(fs.readFileSync(path.join(dataDir, "shared.json"), "utf8"));
const generic = JSON.parse(fs.readFileSync(path.join(dataDir, "generic.json"), "utf8"));

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

function addLocalComplianceLinks(html) {
  return html.replace(
    `      © 2026 F45 TRAINING &nbsp;|&nbsp;\n      <a href="https://f45training.com/terms/" target="_blank">Terms &amp; Disclosures</a>\n      &nbsp;|&nbsp;\n      <a href="https://f45training.com/privacy-policy/" target="_blank">Privacy Policy</a>`,
    `      © 2026 F45 TRAINING &nbsp;|&nbsp;\n      <a href="/privacy/">F45 Pompano Privacy Policy</a>\n      &nbsp;|&nbsp;\n      <a href="/terms/">F45 Pompano Terms &amp; Conditions</a>`
  );
}

const trialCheckoutUrl = "https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001";

const rootLeadCaptureCss = String.raw`

/* ROOT HERO LEAD CAPTURE - 10DLC compliance */
.video-hero-section{width:100% !important;max-width:none !important;min-height:clamp(720px,82vw,900px) !important;height:auto !important;margin:0 !important;border-radius:0 !important;box-shadow:none !important;padding:42px 20px !important;display:flex !important;align-items:center !important;justify-content:center !important;overflow:hidden !important;background:#000 !important;line-height:normal !important;}
.video-hero-section .hero-video{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;object-fit:cover !important;z-index:1 !important;}
.video-hero-section::after{content:"" !important;position:absolute !important;inset:0 !important;z-index:2 !important;background:linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.42),rgba(0,0,0,.68)) !important;pointer-events:none !important;}
.root-hero-lead-overlay{position:relative !important;z-index:12 !important;width:min(1120px,100%) !important;display:grid !important;grid-template-columns:minmax(0,1fr) minmax(360px,500px) !important;gap:34px !important;align-items:center !important;margin:0 auto !important;}
.root-hero-copy{color:#fff !important;text-shadow:0 3px 14px rgba(0,0,0,.58) !important;}
.root-hero-eyebrow{color:#FFCC00 !important;font-size:13px !important;font-weight:900 !important;letter-spacing:2.4px !important;text-transform:uppercase !important;margin-bottom:12px !important;}
.root-hero-copy h1{color:#fff !important;font-size:clamp(2.4rem,6vw,5rem) !important;line-height:.95 !important;font-weight:900 !important;text-transform:uppercase !important;margin:0 0 16px !important;}
.root-hero-copy h1 span{display:block !important;color:#E8272A !important;}
.root-hero-sub{max-width:560px !important;color:rgba(255,255,255,.9) !important;font-size:clamp(1rem,2vw,1.25rem) !important;line-height:1.55 !important;font-weight:700 !important;margin:0 0 20px !important;}
.root-hero-proof-row{display:flex !important;flex-wrap:wrap !important;gap:10px !important;margin-top:18px !important;}
.root-hero-proof-row span{background:rgba(255,255,255,.12) !important;border:1px solid rgba(255,255,255,.22) !important;border-radius:999px !important;color:#fff !important;padding:8px 12px !important;font-size:12px !important;font-weight:900 !important;text-transform:uppercase !important;letter-spacing:.7px !important;}
.root-claim-form-card{background:rgba(255,255,255,.97) !important;color:#111 !important;border:1px solid rgba(255,255,255,.78) !important;border-top:6px solid #E8272A !important;border-radius:18px !important;overflow:hidden !important;box-shadow:0 24px 70px rgba(0,0,0,.42) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;}
.root-claim-form-header{background:#1C1C2E !important;color:#fff !important;text-align:center !important;padding:24px 24px 20px !important;}
.root-claim-form-header h2{color:#fff !important;font-size:clamp(1.4rem,3vw,2rem) !important;line-height:1.08 !important;font-weight:900 !important;margin:0 0 8px !important;text-transform:uppercase !important;}
.root-claim-form-header p{max-width:420px !important;margin:0 auto !important;color:rgba(255,255,255,.78) !important;font-size:.9rem !important;line-height:1.45 !important;font-weight:600 !important;}
.root-lead-form{padding:22px !important;display:grid !important;grid-template-columns:1fr 1fr !important;gap:13px !important;background:#fff !important;}
.root-lead-form .form-row{display:flex !important;flex-direction:column !important;gap:6px !important;}
.root-lead-form label:not(.sms-consent-row){font-size:.7rem !important;font-weight:900 !important;letter-spacing:1px !important;text-transform:uppercase !important;color:#1C1C2E !important;}
.root-lead-form input{width:100% !important;border:1px solid #D5DAE3 !important;border-radius:8px !important;padding:12px !important;font-family:'Inter',system-ui,sans-serif !important;font-size:.95rem !important;color:#111 !important;background:#fff !important;line-height:1.2 !important;}
.root-lead-form input:focus{outline:none !important;border-color:#E8272A !important;box-shadow:0 0 0 4px rgba(232,39,42,.12) !important;}
.sms-consent-row{grid-column:1/-1 !important;display:flex !important;gap:10px !important;align-items:flex-start !important;padding:12px !important;background:#F7F8FB !important;border:1px solid #E5E7EB !important;border-radius:8px !important;font-size:.7rem !important;line-height:1.45 !important;color:#4B5563 !important;text-align:left !important;}
.sms-consent-row input{width:auto !important;margin-top:3px !important;flex-shrink:0 !important;}
.sms-consent-row a{color:#E8272A !important;font-weight:900 !important;text-decoration:none !important;}
.sms-consent-row a:hover{text-decoration:underline !important;}
.sms-no-share-note{grid-column:1/-1 !important;font-size:.69rem !important;line-height:1.42 !important;color:#6B7280 !important;margin:-4px 0 0 !important;text-align:left !important;}
.root-claim-submit{grid-column:1/-1 !important;width:100% !important;border:none !important;border-radius:8px !important;background:#E8272A !important;color:#fff !important;font-size:.98rem !important;font-weight:900 !important;text-transform:uppercase !important;letter-spacing:.5px !important;padding:15px 18px !important;cursor:pointer !important;box-shadow:0 4px 0 rgba(80,0,0,.25),0 4px 12px rgba(0,0,0,.18) !important;}
.root-claim-submit:hover{background:#C91F22 !important;}
.root-form-small-note{grid-column:1/-1 !important;text-align:center !important;color:#6B7280 !important;font-size:.74rem !important;line-height:1.42 !important;margin:-2px 0 0 !important;}
.root-claim-success{display:none !important;margin:22px !important;padding:26px 22px !important;text-align:center !important;border-radius:12px !important;background:#F7FFF7 !important;border:1px solid #B7E4B7 !important;}
.root-claim-success h3{color:#1C1C2E !important;font-size:1.35rem !important;line-height:1.15 !important;margin:0 0 10px !important;font-weight:900 !important;}
.root-claim-success p{color:#4B5563 !important;font-size:.92rem !important;line-height:1.55 !important;max-width:420px !important;margin:0 auto 16px !important;}
.root-success-label{display:inline-block !important;background:#FFB800 !important;color:#1C1C2E !important;font-size:.72rem !important;font-weight:900 !important;letter-spacing:1.5px !important;text-transform:uppercase !important;padding:7px 11px !important;border-radius:999px !important;margin-bottom:12px !important;}
.root-claim-success .promo-claim-btn{display:inline-flex !important;width:auto !important;min-width:260px !important;justify-content:center !important;text-align:center !important;color:#fff !important;}
.root-trial-help-note{font-size:.76rem !important;color:#6B7280 !important;margin-top:13px !important;margin-bottom:0 !important;}
.video-hero-section .sound-toggle-btn{z-index:20 !important;}
@media(max-width:900px){.video-hero-section{min-height:auto !important;padding:28px 16px 34px !important;}.root-hero-lead-overlay{grid-template-columns:1fr !important;gap:20px !important;max-width:560px !important;}.root-hero-copy{text-align:center !important;}.root-hero-sub{margin-left:auto !important;margin-right:auto !important;}.root-hero-proof-row{justify-content:center !important;}}
@media(max-width:640px){.video-hero-section{padding:20px 14px 26px !important;}.root-hero-copy h1{font-size:2.45rem !important;}.root-hero-sub{font-size:.94rem !important;}.root-hero-proof-row{display:none !important;}.root-claim-form-header{padding:20px 16px 17px !important;}.root-lead-form{grid-template-columns:1fr !important;padding:18px !important;gap:12px !important;}.root-claim-success{margin:18px !important;}.root-claim-success .promo-claim-btn{font-size:15px !important;white-space:normal !important;min-width:0 !important;width:100% !important;}}
`;

const rootLeadCaptureHtml = String.raw`
<div class="root-hero-lead-overlay" id="claim-form">
  <div class="root-hero-copy">
    <div class="root-hero-eyebrow">First-time local residents only</div>
    <h1>Reserve Your <span>3 for $30 Trial</span></h1>
    <p class="root-hero-sub">Fill out the quick form to unlock your trial offer for F45 Training Pompano Beach.</p>
    <div class="root-hero-proof-row" aria-label="Offer highlights">
      <span>Strength + Cardio</span>
      <span>Coach-led workouts</span>
      <span>Local studio</span>
    </div>
  </div>

  <div class="root-claim-form-card">
    <div class="root-claim-form-header">
      <h2>Reserve 3 for $30 Trial</h2>
      <p>Submit your info first. Then your trial offer will unlock.</p>
    </div>

    <form id="rootLeadForm" class="root-lead-form" action="https://formsubmit.co/ajax/pompanobeach@f45training.com" method="POST">
      <input type="hidden" name="_subject" value="New Root Website Lead: 3 Classes for $30">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="Lead Source" value="Root Website - f45pompano.com">
      <input type="hidden" name="Offer" value="3 Classes for $30">
      <input type="hidden" id="rootFullNameHidden" name="Full Name" value="">
      <input type="hidden" id="rootSmsOptInHidden" name="sms_opt_in" value="false">
      <input type="hidden" id="rootSmsConsentTimestampHidden" name="sms_consent_timestamp" value="">
      <input type="hidden" name="source_url" value="https://f45pompano.com/">
      <input type="hidden" name="consent_version" value="2026-08-29-v1">
      <input type="hidden" name="consent_language" value="I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Standard message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.">

      <div class="form-row"><label for="rootFirstName">First Name *</label><input id="rootFirstName" name="first_name" type="text" autocomplete="given-name" required minlength="2" pattern="[A-Za-z][A-Za-z\s\-']{1,}" title="Please enter at least 2 letters."></div>
      <div class="form-row"><label for="rootLastName">Last Name *</label><input id="rootLastName" name="last_name" type="text" autocomplete="family-name" required minlength="2" pattern="[A-Za-z][A-Za-z\s\-']{1,}" title="Please enter at least 2 letters."></div>
      <div class="form-row"><label for="rootEmail">Email *</label><input id="rootEmail" name="email" type="email" autocomplete="email" required></div>
      <div class="form-row"><label for="rootPhone">Mobile Phone *</label><input id="rootPhone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(954) 555-1234" title="Please enter a valid U.S. phone number."></div>

      <label class="sms-consent-row">
        <input id="rootSmsConsent" type="checkbox" name="sms_consent_checkbox" value="yes">
        <span>I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Standard message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a> | <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a></span>
      </label>

      <p class="sms-no-share-note">Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.</p>
      <button type="submit" class="root-claim-submit">Submit &amp; Unlock Offer</button>
      <p class="root-form-small-note">First-time local residents only. Valid for a limited time. Must book first class in advance.</p>
    </form>

    <div id="rootClaimSuccess" class="root-claim-success" tabindex="-1">
      <div class="root-success-label">Offer unlocked!</div>
      <h3>Your 3 Classes for $30 offer is ready.</h3>
      <p>Your trial offer is unlocked. Continue to activate your trial. Eligibility will be verified before your first class.</p>
      <a class="promo-claim-btn" href="https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001" target="_blank" rel="noopener">Activate Trial Offer</a>
      <p class="root-trial-help-note">Use the same email you entered here. If you need help activating your offer, call/text us at 954-302-3889.</p>
    </div>
  </div>
</div>
`;

const rootLeadCaptureJs = String.raw`
<script>
document.addEventListener("DOMContentLoaded", function () {
  const hero = document.querySelector(".video-hero-section") || document.querySelector(".screenshot-hero");
  if (hero && !document.getElementById("claim-form")) {
    hero.insertAdjacentHTML("beforeend", ${JSON.stringify(rootLeadCaptureHtml)});
  }

  document.querySelectorAll('a[href="#claim-form"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const target = document.getElementById("claim-form");
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  const form = document.getElementById("rootLeadForm");
  const successBox = document.getElementById("rootClaimSuccess");
  if (!form) return;

  function showSuccessBox() {
    if (!successBox) return;
    form.style.display = "none";
    successBox.style.setProperty("display", "block", "important");
    requestAnimationFrame(function () {
      successBox.focus({ preventScroll: true });
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstNameField = form.querySelector("#rootFirstName");
    const lastNameField = form.querySelector("#rootLastName");
    const emailField = form.querySelector("#rootEmail");
    const phoneField = form.querySelector("#rootPhone");
    const smsCheckbox = form.querySelector("#rootSmsConsent");
    const fullNameHidden = form.querySelector("#rootFullNameHidden");
    const smsOptInHidden = form.querySelector("#rootSmsOptInHidden");
    const smsTimestampHidden = form.querySelector("#rootSmsConsentTimestampHidden");

    const validName = function (value) { return /^[A-Za-z][A-Za-z\s\-']{1,}$/.test((value || "").trim()); };

    if (!validName(firstNameField && firstNameField.value)) { alert("Please enter your full first name with at least 2 letters."); if (firstNameField) firstNameField.focus(); return; }
    if (!validName(lastNameField && lastNameField.value)) { alert("Please enter your full last name with at least 2 letters."); if (lastNameField) lastNameField.focus(); return; }

    if (phoneField) {
      const phoneDigits = phoneField.value.replace(/\D/g, "");
      const isValidUSPhone = phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.charAt(0) === "1");
      if (!isValidUSPhone) { alert("Please enter a valid U.S. phone number so we can contact you about your trial."); phoneField.focus(); return; }
      const normalizedPhone = phoneDigits.length === 11 ? phoneDigits.substring(1) : phoneDigits;
      phoneField.value = "(" + normalizedPhone.substring(0, 3) + ") " + normalizedPhone.substring(3, 6) + "-" + normalizedPhone.substring(6);
    }

    const fullName = ((firstNameField && firstNameField.value.trim()) || "") + " " + ((lastNameField && lastNameField.value.trim()) || "");
    const smsOptIn = !!(smsCheckbox && smsCheckbox.checked);
    const timestamp = new Date().toISOString();
    const normalizedPhoneForPayload = phoneField ? phoneField.value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") : "";

    if (fullNameHidden) fullNameHidden.value = fullName.trim();
    if (smsOptInHidden) smsOptInHidden.value = smsOptIn ? "true" : "false";
    if (smsTimestampHidden) smsTimestampHidden.value = timestamp;

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Unlocking Offer..."; }

    const payload = {
      _subject: "New Root Website Lead: " + fullName.trim() + " - 3 Classes for $30",
      _template: "table",
      _captcha: "false",
      "Lead Source": "Root Website - f45pompano.com",
      "Offer": "3 Classes for $30",
      "Full Name": fullName.trim(),
      "first_name": firstNameField ? firstNameField.value.trim() : "",
      "last_name": lastNameField ? lastNameField.value.trim() : "",
      "email": emailField ? emailField.value.trim() : "",
      "phone": normalizedPhoneForPayload,
      "sms_opt_in": smsOptIn,
      "sms_consent_timestamp": timestamp,
      "source_url": "https://f45pompano.com/",
      "consent_version": "2026-08-29-v1",
      "consent_language": "I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Standard message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes."
    };

    try {
      const response = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("FormSubmit did not accept the submission");
      showSuccessBox();
    } catch (error) {
      alert("Something went wrong submitting the form. Please call or text us at 954-302-3889 and we’ll help you activate the offer.");
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Submit & Unlock Offer"; }
    }
  });
});
</script>
`;

function addRootLeadCapture(html) {
  html = html.replaceAll(`href="${trialCheckoutUrl}" target="_blank" rel="noopener"`, `href="#claim-form"`);
  html = html.replaceAll(`href="${trialCheckoutUrl}" target="_blank"`, `href="#claim-form"`);
  html = html.replaceAll("CLAIM 3 CLASSES FOR $30", "Reserve 3 for $30 Trial");
  html = html.replaceAll("Claim 3 Classes for $30", "Reserve 3 for $30 Trial");
  html = html.replaceAll("CLAIM {{genericTrialType}} FOR {{genericTrialCost}}", "Reserve 3 for $30 Trial");
  html = html.replaceAll("Secure checkout powered by Mindbody®", "Complete the short form to unlock your trial offer");
  html = html.replaceAll("Complete the short form to unlock Mindbody® checkout", "Complete the short form to unlock your trial offer");
  html = html.replaceAll("Mindbody® checkout", "your trial offer");
  html = html.replaceAll("Mindbody checkout", "your trial offer");
  html = html.replaceAll("Mindbody", "your trial offer");

  html = html.replace(`</style>`, `${rootLeadCaptureCss}\n</style>`);
  html = html.replace(`</body>`, `${rootLeadCaptureJs}\n</body>`);
  return html;
}

// Default homepage
const genericData = { ...shared, ...generic };
const renderedGenericPage = addLocalComplianceLinks(addRootLeadCapture(render(genericTemplate, genericData)));
fs.writeFileSync(path.join(distDir, "index.html"), renderedGenericPage);

// Partner pages
for (const file of fs.readdirSync(dataDir)) {
  if (file === "shared.json") continue;
  if (file === "generic.json") continue;
  if (!file.endsWith(".json")) continue;

  const partner = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  const partnerData = { ...shared, ...partner };

  const renderedPartnerPage = render(
    file === "meta.json" ? metaTemplate :
    file === "sands-harbor.json" ? sandsHarborTemplate :
    partnerTemplate,
    partnerData
  );

  fs.writeFileSync(path.join(distDir, `${partnerData.slug}.html`), renderedPartnerPage);

  const partnerPageDir = path.join(distDir, partnerData.slug);
  fs.mkdirSync(partnerPageDir, { recursive: true });
  fs.writeFileSync(path.join(partnerPageDir, "index.html"), renderedPartnerPage);

  console.log(`Generated ${partnerData.slug}.html`);
}
