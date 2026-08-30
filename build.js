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

function addLocalComplianceLinks(html) {
  return html.replace(
    `      © 2026 F45 TRAINING &nbsp;|&nbsp;\n      <a href="https://f45training.com/terms/" target="_blank">Terms &amp; Disclosures</a>\n      &nbsp;|&nbsp;\n      <a href="https://f45training.com/privacy-policy/" target="_blank">Privacy Policy</a>`,
    `      © 2026 F45 TRAINING &nbsp;|&nbsp;\n      <a href="/privacy/">F45 Pompano Privacy Policy</a>\n      &nbsp;|&nbsp;\n      <a href="/terms/">F45 Pompano Terms &amp; Conditions</a>`
  );
}

const rootLeadCaptureCss = String.raw`

/* ROOT LEAD CAPTURE - 10DLC compliance */
.root-claim-form-section{background:linear-gradient(180deg,#EDF0F8 0%,#FFFFFF 100%);padding:54px 20px 58px;}
.root-claim-form-wrap{max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-top:6px solid #E8272A;border-radius:16px;box-shadow:0 18px 45px rgba(28,28,46,.12);overflow:hidden;}
.root-claim-form-header{background:#1C1C2E;color:#FFFFFF;text-align:center;padding:30px 28px 26px;}
.root-claim-form-header h2{font-size:clamp(1.65rem,4vw,2.35rem);line-height:1.08;font-weight:900;margin:0 0 10px;}
.root-claim-form-header p{max-width:560px;margin:0 auto;color:rgba(255,255,255,.76);font-size:.94rem;line-height:1.6;}
.root-lead-form{padding:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.root-lead-form .form-row{display:flex;flex-direction:column;gap:7px;}
.root-lead-form .form-row.full{grid-column:1/-1;}
.root-lead-form label{font-size:.76rem;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#1C1C2E;}
.root-lead-form input{width:100%;border:1px solid #D5DAE3;border-radius:8px;padding:14px 14px;font-family:'Inter',system-ui,sans-serif;font-size:1rem;color:#111111;background:#FFFFFF;}
.root-lead-form input:focus{outline:none;border-color:#E8272A;box-shadow:0 0 0 4px rgba(232,39,42,.12);}
.sms-consent-row{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;padding:14px;background:#F7F8FB;border:1px solid #E5E7EB;border-radius:8px;font-size:.76rem;line-height:1.55;color:#4B5563;}
.sms-consent-row input{width:auto;margin-top:4px;flex-shrink:0;}
.sms-consent-row a{color:#E8272A;font-weight:800;text-decoration:none;}
.sms-consent-row a:hover{text-decoration:underline;}
.sms-no-share-note{grid-column:1/-1;font-size:.74rem;line-height:1.5;color:#6B7280;margin-top:-6px;}
.root-claim-submit{grid-column:1/-1;width:100%;border:none;border-radius:8px;background:#E8272A;color:#FFFFFF;font-size:1rem;font-weight:900;text-transform:uppercase;letter-spacing:.5px;padding:17px 22px;cursor:pointer;box-shadow:0 4px 0 rgba(80,0,0,.25),0 4px 12px rgba(0,0,0,.18);}
.root-claim-submit:hover{background:#C91F22;}
.root-form-small-note{grid-column:1/-1;text-align:center;color:#6B7280;font-size:.78rem;line-height:1.5;margin-top:-4px;}
.root-claim-success{display:none;margin:28px;padding:28px 24px;text-align:center;border-radius:12px;background:#F7FFF7;border:1px solid #B7E4B7;}
.root-claim-success h3{color:#1C1C2E;font-size:1.35rem;line-height:1.15;margin-bottom:10px;}
.root-claim-success p{color:#4B5563;font-size:.94rem;line-height:1.6;max-width:520px;margin:0 auto 18px;}
.root-success-label{display:inline-block;background:#FFB800;color:#1C1C2E;font-size:.72rem;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;padding:7px 11px;border-radius:999px;margin-bottom:12px;}
.root-claim-success .promo-claim-btn{display:inline-block;width:auto;min-width:260px;text-align:center;}
.root-mindbody-help-note{font-size:.78rem !important;color:#6B7280 !important;margin-top:14px !important;margin-bottom:0 !important;}
@media(max-width:640px){.root-claim-form-section{padding:38px 14px 44px;}.root-claim-form-header{padding:25px 18px 22px;}.root-lead-form{grid-template-columns:1fr;padding:20px;gap:14px;}.root-claim-success{margin:20px;}.root-claim-success .promo-claim-btn{font-size:17px;white-space:normal;min-width:0;width:100%;}}
`;

const rootLeadCaptureHtml = String.raw`

<section class="root-claim-form-section" id="claim-form">
  <div class="root-claim-form-wrap">
    <div class="root-claim-form-header">
      <h2>Unlock Your {{genericTrialType}} for {{genericTrialCost}}</h2>
      <p>Complete this short form first. Once submitted, your Mindbody checkout link will appear so you can activate the 3 Classes for $30 offer.</p>
    </div>

    <form id="rootLeadForm" class="root-lead-form" action="https://formsubmit.co/ajax/pompanobeach@f45training.com" method="POST">
      <input type="hidden" name="_subject" value="New Root Website Lead: 3 Classes for $30">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="Lead Source" value="Root Website - f45pompano.com">
      <input type="hidden" name="Offer" value="{{genericTrialType}} for {{genericTrialCost}}">
      <input type="hidden" id="rootFullNameHidden" name="Full Name" value="">
      <input type="hidden" id="rootSmsOptInHidden" name="sms_opt_in" value="false">
      <input type="hidden" id="rootSmsConsentTimestampHidden" name="sms_consent_timestamp" value="">
      <input type="hidden" name="source_url" value="https://f45pompano.com/">
      <input type="hidden" name="consent_version" value="2026-08-29-v1">
      <input type="hidden" name="consent_language" value="I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Standard message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.">

      <div class="form-row">
        <label for="rootFirstName">First Name *</label>
        <input id="rootFirstName" name="first_name" type="text" autocomplete="given-name" required minlength="2" pattern="[A-Za-z][A-Za-z\s\-']{1,}" title="Please enter at least 2 letters.">
      </div>

      <div class="form-row">
        <label for="rootLastName">Last Name *</label>
        <input id="rootLastName" name="last_name" type="text" autocomplete="family-name" required minlength="2" pattern="[A-Za-z][A-Za-z\s\-']{1,}" title="Please enter at least 2 letters.">
      </div>

      <div class="form-row">
        <label for="rootEmail">Email *</label>
        <input id="rootEmail" name="email" type="email" autocomplete="email" required>
      </div>

      <div class="form-row">
        <label for="rootPhone">Mobile Phone *</label>
        <input id="rootPhone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(954) 555-1234" title="Please enter a valid U.S. phone number.">
      </div>

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
      <h3>Your {{genericTrialType}} for {{genericTrialCost}} offer is ready.</h3>
      <p>Continue to Mindbody to create your account and activate your trial. Eligibility will be verified before your first class.</p>
      <a class="promo-claim-btn" href="https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001" target="_blank" rel="noopener">Continue to Mindbody</a>
      <p class="root-mindbody-help-note">Mindbody may ask you to sign in or create an account before checkout. Use the same email you entered here. If Mindbody says your account already exists, choose “Forgot Password” or call/text us at {{phone}}.</p>
    </div>
  </div>
</section>
`;

const rootLeadCaptureJs = String.raw`

<script>
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("rootLeadForm");
  const successBox = document.getElementById("rootClaimSuccess");
  if (!form) return;

  function showSuccessBox() {
    if (!successBox) return;
    form.style.display = "none";
    successBox.style.display = "block";
    requestAnimationFrame(function () {
      successBox.focus({ preventScroll: true });
      const rect = successBox.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - ((window.innerHeight - rect.height) / 2);
      window.scrollTo({ top: Math.max(0, targetY), left: 0, behavior: "smooth" });
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

    const validName = function (value) {
      return /^[A-Za-z][A-Za-z\s\-']{1,}$/.test((value || "").trim());
    };

    if (!validName(firstNameField && firstNameField.value)) {
      alert("Please enter your full first name with at least 2 letters.");
      if (firstNameField) firstNameField.focus();
      return;
    }

    if (!validName(lastNameField && lastNameField.value)) {
      alert("Please enter your full last name with at least 2 letters.");
      if (lastNameField) lastNameField.focus();
      return;
    }

    if (phoneField) {
      const phoneDigits = phoneField.value.replace(/\D/g, "");
      const isValidUSPhone = phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.charAt(0) === "1");

      if (!isValidUSPhone) {
        alert("Please enter a valid U.S. phone number so we can contact you about your trial.");
        phoneField.focus();
        return;
      }

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
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Unlocking Offer...";
    }

    const payload = {
      _subject: "New Root Website Lead: " + fullName.trim() + " - 3 Classes for $30",
      _template: "table",
      _captcha: "false",
      "Lead Source": "Root Website - f45pompano.com",
      "Offer": "{{genericTrialType}} for {{genericTrialCost}}",
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
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("FormSubmit did not accept the submission");
      }

      showSuccessBox();
    } catch (error) {
      alert("Something went wrong submitting the form. Please call or text us at {{phone}} and we’ll help you activate the offer.");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit & Unlock Offer";
      }
    }
  });
});
</script>
`;

function addRootLeadCapture(html) {
  html = html.replace(
    `<a class="promo-claim-btn" href="https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001" target="_blank">CLAIM {{genericTrialType}} FOR {{genericTrialCost}}</a>\n        <div class="topbar-mindbody-note">Secure checkout powered by Mindbody®</div>`,
    `<a class="promo-claim-btn" href="#claim-form">CLAIM {{genericTrialType}} FOR {{genericTrialCost}}</a>\n        <div class="topbar-mindbody-note">Complete the short form to unlock Mindbody® checkout</div>`
  );

  html = html.replace(`</style>`, `${rootLeadCaptureCss}\n</style>`);

  html = html.replace(
    `</section>\n\n\n\n<section class="real-studio-section">`,
    `</section>${rootLeadCaptureHtml}\n<section class="real-studio-section">`
  );

  html = html.replace(`</body>`, `${rootLeadCaptureJs}\n</body>`);

  return html;
}

// Default homepage
const genericData = {
  ...shared,
  ...generic
};

const renderedGenericPage = addLocalComplianceLinks(
  addRootLeadCapture(render(genericTemplate, genericData))
);

fs.writeFileSync(
  path.join(distDir, "index.html"),
  renderedGenericPage
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
    file === "meta.json" ? metaTemplate :
    file === "sands-harbor.json" ? sandsHarborTemplate :
    partnerTemplate,
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
