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

const mindbodyTrialUrl = "https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001";
const SITE_VERSION = "v2026.09.22.2";

const rootLeadCaptureCss = String.raw`

/* ROOT HERO LEAD CAPTURE - 10DLC compliance */
.video-hero-section{
  width:100% !important;
  max-width:none !important;
  min-height:clamp(720px,82vw,900px) !important;
  height:auto !important;
  margin:0 !important;
  border-radius:0 !important;
  box-shadow:none !important;
  padding:42px 20px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  overflow:hidden !important;
  background:#000 !important;
  line-height:normal !important;
}
.video-hero-section .hero-video{
  position:absolute !important;
  inset:0 !important;
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  z-index:1 !important;
}
.video-hero-section::after{
  content:"" !important;
  position:absolute !important;
  inset:0 !important;
  z-index:2 !important;
  background:linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.42),rgba(0,0,0,.68)) !important;
  pointer-events:none !important;
}
.root-hero-lead-overlay{
  position:relative !important;
  z-index:12 !important;
  width:min(1120px,100%) !important;
  display:grid !important;
  grid-template-columns:minmax(0,1fr) minmax(360px,500px) !important;
  gap:34px !important;
  align-items:center !important;
  margin:0 auto !important;
}
.root-hero-copy{
  color:#fff !important;
  text-shadow:0 3px 14px rgba(0,0,0,.58) !important;
}
.root-hero-eyebrow{
  color:#FFCC00 !important;
  font-size:13px !important;
  font-weight:900 !important;
  letter-spacing:2.4px !important;
  text-transform:uppercase !important;
  margin-bottom:12px !important;
}
.root-hero-copy h1{
  color:#fff !important;
  font-size:clamp(2.4rem,6vw,5rem) !important;
  line-height:.95 !important;
  font-weight:900 !important;
  text-transform:uppercase !important;
  margin:0 0 16px !important;
}
.root-hero-copy h1 span{display:block !important;color:#E8272A !important;}
.root-hero-sub{
  max-width:560px !important;
  color:rgba(255,255,255,.9) !important;
  font-size:clamp(1rem,2vw,1.25rem) !important;
  line-height:1.55 !important;
  font-weight:700 !important;
  margin:0 0 20px !important;
}
.root-hero-proof-row{display:flex !important;flex-wrap:wrap !important;gap:10px !important;margin-top:18px !important;}
.root-hero-proof-row span{
  background:rgba(255,255,255,.12) !important;
  border:1px solid rgba(255,255,255,.22) !important;
  border-radius:999px !important;
  color:#fff !important;
  padding:8px 12px !important;
  font-size:12px !important;
  font-weight:900 !important;
  text-transform:uppercase !important;
  letter-spacing:.7px !important;
}
.root-claim-form-card{
  background:rgba(255,255,255,.97) !important;
  color:#111 !important;
  border:1px solid rgba(255,255,255,.78) !important;
  border-top:6px solid #E8272A !important;
  border-radius:18px !important;
  overflow:hidden !important;
  box-shadow:0 24px 70px rgba(0,0,0,.42) !important;
  backdrop-filter:blur(8px) !important;
  -webkit-backdrop-filter:blur(8px) !important;
}
.root-claim-form-header{background:#1C1C2E !important;color:#fff !important;text-align:center !important;padding:24px 24px 20px !important;}
.root-claim-form-header h2{color:#fff !important;font-size:clamp(1.4rem,3vw,2rem) !important;line-height:1.08 !important;font-weight:900 !important;margin:0 0 8px !important;text-transform:uppercase !important;}
.root-claim-form-header p{max-width:420px !important;margin:0 auto !important;color:rgba(255,255,255,.78) !important;font-size:.9rem !important;line-height:1.45 !important;font-weight:600 !important;}
.root-lead-form{padding:22px !important;display:grid !important;grid-template-columns:1fr 1fr !important;gap:13px !important;background:#fff !important;}
.root-lead-form .form-row{display:flex !important;flex-direction:column !important;gap:6px !important;}
.root-lead-form label:not(.sms-consent-row){font-size:.7rem !important;font-weight:900 !important;letter-spacing:1px !important;text-transform:uppercase !important;color:#1C1C2E !important;}
.root-lead-form input{width:100% !important;border:2px solid #B8C0CC !important;border-radius:8px !important;padding:12px !important;font-family:'Inter',system-ui,sans-serif !important;font-size:.95rem !important;color:#111 !important;background:#FFFFFF !important;line-height:1.2 !important;box-shadow:0 1px 0 rgba(17,24,39,.06) !important;}
.root-lead-form input::placeholder{color:#9CA3AF !important;opacity:1 !important;}
.root-lead-form input:focus{outline:none !important;border-color:#E8272A !important;box-shadow:0 0 0 4px rgba(232,39,42,.12) !important;}
.sms-consent-row{
  grid-column:1/-1 !important;
  display:flex !important;
  gap:10px !important;
  align-items:flex-start !important;
  padding:13px !important;
  background:#F7F8FB !important;
  border:1px solid #9CA3AF !important;
  border-radius:8px !important;
  font-size:.82rem !important;
  line-height:1.55 !important;
  color:#111827 !important;
  text-align:left !important;
}
.sms-consent-row input{width:auto !important;margin-top:4px !important;flex-shrink:0 !important;accent-color:#E8272A !important;}
.sms-consent-row a{color:#E8272A !important;font-weight:900 !important;text-decoration:none !important;}
.sms-consent-row a:hover{text-decoration:underline !important;}
.root-inquiry-disclosure{
  grid-column:1/-1 !important;
  margin:0 !important;
  padding:0 !important;
  color:#1F2937 !important;
  font-size:.82rem !important;
  line-height:1.45 !important;
  font-weight:600 !important;
  text-align:left !important;
}
.terms-privacy-row{
  grid-column:1/-1 !important;
  display:flex !important;
  gap:10px !important;
  align-items:flex-start !important;
  padding:12px !important;
  background:#FFFFFF !important;
  border:1px solid #D1D5DB !important;
  border-radius:8px !important;
  font-size:.82rem !important;
  line-height:1.45 !important;
  color:#111827 !important;
  text-align:left !important;
}
.terms-privacy-row input{width:auto !important;margin-top:4px !important;flex-shrink:0 !important;accent-color:#E8272A !important;}
.terms-privacy-row a{color:#E8272A !important;font-weight:900 !important;text-decoration:none !important;}
.terms-privacy-row a:hover{text-decoration:underline !important;}
.terms-privacy-error{
  grid-column:1/-1 !important;
  display:none !important;
  margin:-4px 0 0 !important;
  color:#B91C1C !important;
  font-size:.8rem !important;
  line-height:1.4 !important;
  font-weight:800 !important;
  text-align:left !important;
}
.sms-no-share-note{
  grid-column:1/-1 !important;
  font-size:.8rem !important;
  line-height:1.5 !important;
  color:#1F2937 !important;
  margin:-4px 0 0 !important;
  text-align:left !important;
}
.root-claim-submit{grid-column:1/-1 !important;width:100% !important;border:none !important;border-radius:8px !important;background:#E8272A !important;color:#fff !important;font-size:.98rem !important;font-weight:900 !important;text-transform:uppercase !important;letter-spacing:.5px !important;padding:15px 18px !important;cursor:pointer !important;box-shadow:0 4px 0 rgba(80,0,0,.25),0 4px 12px rgba(0,0,0,.18) !important;}
.root-claim-submit:hover{background:#C91F22 !important;}
.root-form-small-note{grid-column:1/-1 !important;text-align:center !important;color:#6B7280 !important;font-size:.74rem !important;line-height:1.42 !important;margin:-2px 0 0 !important;}
.root-claim-success{display:none !important;margin:22px !important;padding:26px 22px !important;text-align:center !important;border-radius:12px !important;background:#F7FFF7 !important;border:1px solid #B7E4B7 !important;}
.root-claim-success h3{color:#1C1C2E !important;font-size:1.35rem !important;line-height:1.15 !important;margin:0 0 10px !important;font-weight:900 !important;}
.root-claim-success p{color:#4B5563 !important;font-size:.92rem !important;line-height:1.55 !important;max-width:420px !important;margin:0 auto 16px !important;}
.root-success-label{display:inline-block !important;background:#FFB800 !important;color:#1C1C2E !important;font-size:.72rem !important;font-weight:900 !important;letter-spacing:1.5px !important;text-transform:uppercase !important;padding:7px 11px !important;border-radius:999px !important;margin-bottom:12px !important;}
.root-claim-success .promo-claim-btn{display:inline-flex !important;width:auto !important;min-width:260px !important;justify-content:center !important;text-align:center !important;color:#fff !important;}
.root-mindbody-help-note{font-size:.76rem !important;color:#6B7280 !important;margin-top:13px !important;margin-bottom:0 !important;}
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

  <div class="screenshot-offer-card form-overlay-card">
    <div class="partner-exclusive-header">
      <h2>Reserve 3 for $30 Trial</h2>
      <p>Submit your info first. Then your 3 Classes for $30 offer will unlock.</p>
    </div>

    <form id="partnerLeadForm" class="partner-lead-form overlay-partner-form" action="https://formsubmit.co/ajax/pompanobeach@f45training.com" method="POST">
      <input type="hidden" name="_subject" value="New Root Website Lead: 3 Classes for $30">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="Lead Source" value="Root Website - f45pompano.com">
      <input type="hidden" name="Offer" value="3 Classes for $30">
      <input type="hidden" id="fullNameHidden" name="Full Name" value="">
      <input type="hidden" id="partnerSmsOptInHidden" name="sms_opt_in" value="false">
      <input type="hidden" id="partnerSmsConsentTimestampHidden" name="sms_consent_timestamp" value="">
      <input type="hidden" name="source_url" value="https://f45pompano.com/">
      <input type="hidden" name="consent_version" value="2026-08-29-v1">
      <input type="hidden" name="consent_language" value="I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.">

      <div class="form-row"><label for="firstName">First Name *</label><input id="firstName" name="first_name" type="text" autocomplete="given-name" required minlength="2" pattern="[A-Za-z][A-Za-z\\s\\-']{1,}" title="Please enter at least 2 letters."></div>
      <div class="form-row"><label for="lastName">Last Name *</label><input id="lastName" name="last_name" type="text" autocomplete="family-name" required minlength="2" pattern="[A-Za-z][A-Za-z\\s\\-']{1,}" title="Please enter at least 2 letters."></div>
      <div class="form-row"><label for="email">Email *</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="form-row"><label for="phone">Mobile Phone *</label><input id="phone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(954) 555-1234" title="Please enter a valid U.S. phone number."></div>
      <div class="form-row full"><label for="zipCode">ZIP Code *</label><input id="zipCode" name="zip_code" type="text" required inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" placeholder="5-digit ZIP code"></div>

      <p class="partner-inquiry-disclosure">By submitting this form, you agree that F45 Training Pompano Beach may contact you by phone or email to respond to your inquiry and help you with this offer.</p>

      <label class="terms-privacy-row"><input id="partnerTermsPrivacy" type="checkbox" name="terms_privacy_acknowledged" value="yes" required><span>I agree to F45 Training Pompano Beach’s <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
      <p id="partnerTermsPrivacyError" class="partner-form-error">Please agree to the Terms &amp; Conditions and acknowledge the Privacy Policy before continuing.</p>

      <label class="eligibility-confirm-row"><input id="partnerEligibilityConfirm" type="checkbox" name="local_residency_eligibility" value="yes" required><span>I confirm that I am a first-time visitor and live in one of these ZIP codes (${shared.qualifiedZipCodes}), and am able to verify residency for this offer.</span></label>
      <p id="partnerEligibilityError" class="partner-form-error">Please confirm first-time visitor and local residency eligibility before continuing.</p>

      <label class="sms-consent-row"><input id="partnerSmsConsent" type="checkbox" name="sms_consent_checkbox" value="yes"><span>I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a> | <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a></span></label>
      <p class="sms-no-share-note">Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.</p>

      <button type="submit" class="claim-submit">Submit &amp; Unlock Offer</button>
      <p class="form-small-note">First-time local residents only. Eligibility will be verified before your first class.</p>
    </form>

    <div id="claimSuccess" class="claim-success" tabindex="-1">
      <div class="success-unlocked-label">Offer unlocked!</div>
      <h3>Your 3 Classes for $30 offer is ready.</h3>
      <p>Continue to Mindbody to create your account and activate your trial. Eligibility will be verified before your first class.</p>
      <div class="claim-success-actions">
        <a class="screenshot-cta" href="https://clients.mindbodyonline.com/classic/ws?studioid=616914&stype=43&prodid=653001" target="_blank" rel="noopener">Continue to Mindbody — $30 Trial</a>
      </div>
      <p class="mindbody-help-note">Use the same email you entered here. If your account already exists, choose “Forgot Password” or call/text us at 954-302-3889.</p>
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

  const form=document.getElementById("partnerLeadForm");
  const successBox=document.getElementById("claimSuccess");
  if(!form)return;

  function showSuccessBox(){if(!successBox)return;const parent=form.parentNode;if(parent&&successBox.parentNode===parent){parent.insertBefore(successBox,form);}form.remove();successBox.classList.add("is-visible");successBox.setAttribute("tabindex","-1");requestAnimationFrame(function(){successBox.focus({preventScroll:true});const rect=successBox.getBoundingClientRect();const fullyVisible=rect.top>=0&&rect.bottom<=window.innerHeight;if(!fullyVisible){const targetY=window.scrollY+rect.top-Math.max(20,(window.innerHeight-Math.min(rect.height,window.innerHeight-40))/2);window.scrollTo({top:Math.max(0,targetY),left:0,behavior:"smooth"});}});}

  form.addEventListener("submit",async function(event){
    event.preventDefault();
    const firstNameField=form.querySelector("#firstName"),lastNameField=form.querySelector("#lastName"),emailField=form.querySelector("#email"),phoneField=form.querySelector("#phone"),zipField=form.querySelector("#zipCode"),termsCheckbox=form.querySelector("#partnerTermsPrivacy"),eligibilityCheckbox=form.querySelector("#partnerEligibilityConfirm"),smsCheckbox=form.querySelector("#partnerSmsConsent"),termsError=form.querySelector("#partnerTermsPrivacyError"),eligibilityError=form.querySelector("#partnerEligibilityError"),fullNameHidden=form.querySelector("#fullNameHidden"),smsOptInHidden=form.querySelector("#partnerSmsOptInHidden"),smsTimestampHidden=form.querySelector("#partnerSmsConsentTimestampHidden");
    const validName=function(value){return /^[A-Za-z][A-Za-z\\s\\-']{1,}$/.test((value||"").trim());};
    if(!validName(firstNameField&&firstNameField.value)){alert("Please enter your full first name with at least 2 letters.");if(firstNameField)firstNameField.focus();return;}
    if(!validName(lastNameField&&lastNameField.value)){alert("Please enter your full last name with at least 2 letters.");if(lastNameField)lastNameField.focus();return;}

    const runtimeLanding=(window.__LANDING_CONFIG__||{}),runtimeGlobal=(runtimeLanding.global||{}),runtimePage={...runtimeGlobal,...(runtimeLanding.page||{})};
    const zipValue=zipField?zipField.value.trim():"";
    if(!/^\\d{5}$/.test(zipValue)){alert("Please enter your 5-digit ZIP code.");if(zipField)zipField.focus();return;}
    if(!termsCheckbox||!termsCheckbox.checked){if(termsError)termsError.style.display="block";if(termsCheckbox)termsCheckbox.focus();return;}if(termsError)termsError.style.display="none";
    if(!eligibilityCheckbox||!eligibilityCheckbox.checked){if(eligibilityError)eligibilityError.style.display="block";if(eligibilityCheckbox)eligibilityCheckbox.focus();return;}if(eligibilityError)eligibilityError.style.display="none";

    if(phoneField){const phoneDigits=phoneField.value.replace(/\\D/g,"");const valid=phoneDigits.length===10||(phoneDigits.length===11&&phoneDigits.charAt(0)==="1");if(!valid){alert("Please enter a valid U.S. phone number so we can contact you about your offer.");phoneField.focus();return;}const normalized=phoneDigits.length===11?phoneDigits.substring(1):phoneDigits;phoneField.value="("+normalized.substring(0,3)+") "+normalized.substring(3,6)+"-"+normalized.substring(6);}

    const fullName=((firstNameField&&firstNameField.value.trim())||"")+" "+((lastNameField&&lastNameField.value.trim())||"");const timestamp=new Date().toISOString();const smsOptIn=!!(smsCheckbox&&smsCheckbox.checked);const normalizedPhoneForPayload=phoneField?phoneField.value.replace(/\\D/g,"").replace(/^1(?=\\d{10}$)/,""):"";
    if(fullNameHidden)fullNameHidden.value=fullName.trim();if(smsOptInHidden)smsOptInHidden.value=smsOptIn?"true":"false";if(smsTimestampHidden)smsTimestampHidden.value=timestamp;

    const submitButton=form.querySelector("button[type='submit']");if(submitButton){submitButton.disabled=true;submitButton.textContent="Submitting...";}
    const runtimeOffer=(runtimePage.trialType&&runtimePage.trialCost)?(runtimePage.trialType+" for "+runtimePage.trialCost):"3 Classes for $30";
    const payload={_subject:"New Root Website Lead: "+fullName.trim()+" - "+runtimeOffer,_template:"table",_captcha:"false","Lead Source":"Root Website - f45pompano.com","Offer":runtimeOffer,"Full Name":fullName.trim(),"first_name":firstNameField?firstNameField.value.trim():"","last_name":lastNameField?lastNameField.value.trim():"","email":emailField?emailField.value.trim():"","phone":normalizedPhoneForPayload,"zip_code":zipValue,"local_residency_eligibility":true,"local_residency_eligibility_timestamp":timestamp,"terms_privacy_acknowledged":true,"terms_privacy_acknowledged_timestamp":timestamp,"terms_privacy_version":"2026-09-01-v1","terms_privacy_disclosure":"I agree to F45 Training Pompano Beach’s Terms & Conditions and acknowledge the Privacy Policy.","sms_opt_in":smsOptIn,"sms_consent_timestamp":timestamp,"source_url":window.location.origin+window.location.pathname,"consent_version":"2026-08-29-v1","consent_language":"I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes."};

    try{
      const configuredRecipients=Object.prototype.hasOwnProperty.call(runtimeGlobal,"leadNotificationEmails")?runtimeGlobal.leadNotificationEmails:["pompanobeach@f45training.com"];
      const notificationEmails=Array.isArray(configuredRecipients)?configuredRecipients.map(function(email){return String(email||"").trim().toLowerCase();}).filter(function(email){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);}):[];
      if(notificationEmails.length){const primaryEmail=notificationEmails[0],ccEmails=notificationEmails.slice(1);if(ccEmails.length)payload._cc=ccEmails.join(",");const response=await fetch("https://formsubmit.co/ajax/"+primaryEmail,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error("FormSubmit did not accept the submission");}
      fetch("/api/leads/intake",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({source_type:"website",source_name:"Main Website",source_slug:"root",first_name:firstNameField?firstNameField.value.trim():"",last_name:lastNameField?lastNameField.value.trim():"",email:emailField?emailField.value.trim():"",phone:normalizedPhoneForPayload,zip:zipValue,marketing_opt_in:smsOptIn,source_url:window.location.href,offer:runtimeOffer})}).catch(function(){});
      showSuccessBox();
    }catch(error){alert("Something went wrong submitting the form. Please call or text us at 954-302-3889 and we’ll help you activate the offer.");if(submitButton){submitButton.disabled=false;submitButton.textContent="Submit & Unlock Offer";}}
  });
});
</script>
`;

function addRootLeadCapture(html) {
  html = html.replaceAll(`href="${mindbodyTrialUrl}" target="_blank" rel="noopener"`, `href="#claim-form"`);
  html = html.replaceAll(`href="${mindbodyTrialUrl}" target="_blank"`, `href="#claim-form"`);
  html = html.replaceAll("CLAIM 3 CLASSES FOR $30", "Reserve 3 for $30 Trial");
  html = html.replaceAll("Claim 3 Classes for $30", "Reserve 3 for $30 Trial");
  html = html.replaceAll("CLAIM {{genericTrialType}} FOR {{genericTrialCost}}", "Reserve 3 for $30 Trial");
  html = html.replaceAll("Secure checkout powered by Mindbody®", "Complete the short form to unlock your trial offer");
  html = html.replaceAll("Complete the short form to unlock Mindbody® checkout", "Complete the short form to unlock your trial offer");

  html = html.replace(`</style>`, `${rootLeadCaptureCss}\n</style>`);
  html = html.replace(`</head>`, `${partnerRootFormCss}\n</head>`);
  html = html.replace(`</body>`, `${rootLeadCaptureJs}\n</body>`);
  return html;
}


const partnerTrialUrl = mindbodyTrialUrl;
const partnerConsentVersion = "2026-08-29-v1";
const partnerTermsVersion = "2026-09-01-v1";
const partnerConsentLanguage = "I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. Privacy Policy | Terms & Conditions. Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.";

const partnerRootFormCss = String.raw`
<style>
/* PARTNER HERO + ROOT-STYLE LEAD FORM */
.screenshot-hero{width:100% !important;max-width:none !important;min-height:clamp(760px,82vw,920px) !important;height:auto !important;margin:0 !important;padding:42px 20px !important;display:flex !important;align-items:center !important;justify-content:center !important;position:relative !important;overflow:hidden !important;background:#000 !important;background-image:none !important;line-height:normal !important;}
.screenshot-hero-video{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;object-fit:cover !important;opacity:1 !important;filter:saturate(1.05) !important;z-index:1 !important;}
.screenshot-hero::after{content:"" !important;position:absolute !important;inset:0 !important;z-index:2 !important;background:linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.42),rgba(0,0,0,.68)) !important;pointer-events:none !important;}
.partner-hero-shell{position:relative !important;z-index:12 !important;width:min(1120px,100%) !important;display:grid !important;grid-template-columns:minmax(0,1fr) minmax(360px,500px) !important;gap:34px !important;align-items:center !important;margin:0 auto !important;}
.partner-hero-copy{color:#fff !important;text-shadow:0 3px 14px rgba(0,0,0,.58) !important;}
.partner-hero-eyebrow{color:#FFCC00 !important;font-size:13px !important;font-weight:900 !important;letter-spacing:2.4px !important;text-transform:uppercase !important;margin-bottom:12px !important;}
.partner-hero-copy h1{color:#fff !important;font-size:clamp(2.4rem,6vw,5rem) !important;line-height:.95 !important;font-weight:900 !important;text-transform:uppercase !important;margin:0 0 16px !important;}
.partner-hero-copy h1 span{display:block !important;color:#E8272A !important;}
.partner-hero-sub{max-width:560px !important;color:rgba(255,255,255,.9) !important;font-size:clamp(1rem,2vw,1.25rem) !important;line-height:1.55 !important;font-weight:700 !important;margin:0 0 20px !important;}
.partner-hero-proof-row{display:flex !important;flex-wrap:wrap !important;gap:10px !important;margin-top:18px !important;}
.partner-hero-proof-row span{background:rgba(255,255,255,.12) !important;border:1px solid rgba(255,255,255,.22) !important;border-radius:999px !important;color:#fff !important;padding:8px 12px !important;font-size:12px !important;font-weight:900 !important;text-transform:uppercase !important;letter-spacing:.7px !important;}
.form-overlay-card{position:relative !important;inset:auto !important;left:auto !important;top:auto !important;transform:none !important;width:100% !important;min-height:0 !important;max-height:none !important;margin:0 !important;padding:0 !important;overflow:hidden !important;background:rgba(255,255,255,.98) !important;color:#111 !important;border:1px solid rgba(255,255,255,.78) !important;border-top:6px solid #E8272A !important;border-radius:18px !important;box-shadow:0 24px 70px rgba(0,0,0,.42) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;text-align:left !important;}
.form-overlay-card::before{display:none !important;}
.partner-exclusive-header{background:#1C1C2E !important;color:#FFFFFF !important;text-align:center !important;padding:0 !important;border-bottom:1px solid rgba(28,28,46,.15) !important;}
.partner-exclusive-header h2{background:#FFB800 !important;color:#1C1C2E !important;font-size:clamp(1.35rem,3vw,1.9rem) !important;line-height:1.08 !important;font-weight:900 !important;text-transform:uppercase !important;margin:0 !important;padding:18px 22px 16px !important;text-shadow:none !important;}
.partner-exclusive-header p{max-width:none !important;margin:0 !important;background:#1C1C2E !important;color:#FFFFFF !important;font-size:.88rem !important;line-height:1.45 !important;font-weight:700 !important;padding:14px 20px 16px !important;}
.partner-lead-form{padding:22px !important;display:grid !important;grid-template-columns:1fr 1fr !important;gap:13px !important;background:#fff !important;}
.partner-lead-form .form-row{display:flex !important;flex-direction:column !important;gap:6px !important;}
.partner-lead-form .form-row.full{grid-column:1/-1 !important;}
.partner-lead-form label:not(.terms-privacy-row):not(.eligibility-confirm-row):not(.sms-consent-row){font-size:.7rem !important;font-weight:900 !important;letter-spacing:1px !important;text-transform:uppercase !important;color:#1C1C2E !important;}
.partner-lead-form input{width:100% !important;border:2px solid #B8C0CC !important;border-radius:8px !important;padding:12px !important;font-family:'Inter',system-ui,sans-serif !important;font-size:.95rem !important;color:#111 !important;background:#fff !important;line-height:1.2 !important;box-shadow:0 1px 0 rgba(17,24,39,.06) !important;}
.partner-lead-form input:focus{outline:none !important;border-color:#E8272A !important;box-shadow:0 0 0 4px rgba(232,39,42,.12) !important;}
.partner-inquiry-disclosure,.sms-no-share-note{grid-column:1/-1 !important;margin:0 !important;color:#1F2937 !important;font-size:.82rem !important;line-height:1.45 !important;font-weight:600 !important;text-align:left !important;}
.terms-privacy-row,.eligibility-confirm-row,.sms-consent-row{grid-column:1/-1 !important;display:flex !important;gap:10px !important;align-items:flex-start !important;padding:12px !important;border-radius:8px !important;font-size:.82rem !important;line-height:1.48 !important;color:#111827 !important;text-align:left !important;text-transform:none !important;letter-spacing:0 !important;}
.terms-privacy-row{background:#fff !important;border:1px solid #D1D5DB !important;}
.eligibility-confirm-row{background:#FFF8E1 !important;border:1px solid #FFD54F !important;font-weight:700 !important;}
.sms-consent-row{background:#F7F8FB !important;border:1px solid #9CA3AF !important;}
.terms-privacy-row input,.eligibility-confirm-row input,.sms-consent-row input{width:auto !important;margin-top:4px !important;flex-shrink:0 !important;accent-color:#E8272A !important;}
.terms-privacy-row a,.sms-consent-row a{color:#E8272A !important;font-weight:900 !important;text-decoration:none !important;}
.terms-privacy-row a:hover,.sms-consent-row a:hover{text-decoration:underline !important;}
.partner-form-error{grid-column:1/-1 !important;display:none !important;margin:-4px 0 0 !important;color:#B91C1C !important;font-size:.8rem !important;line-height:1.4 !important;font-weight:800 !important;}
.claim-submit{grid-column:1/-1 !important;width:100% !important;border:none !important;border-radius:8px !important;background:#E8272A !important;color:#fff !important;font-size:.98rem !important;font-weight:900 !important;text-transform:uppercase !important;letter-spacing:.5px !important;padding:15px 18px !important;cursor:pointer !important;box-shadow:0 4px 0 rgba(80,0,0,.25),0 4px 12px rgba(0,0,0,.18) !important;}
.claim-submit:hover{background:#C91F22 !important;}
.form-small-note{grid-column:1/-1 !important;text-align:center !important;color:#6B7280 !important;font-size:.74rem !important;line-height:1.42 !important;margin:-2px 0 0 !important;}
.claim-success{display:none !important;margin:22px !important;padding:26px 22px !important;text-align:center !important;border-radius:12px !important;background:#F7FFF7 !important;border:1px solid #B7E4B7 !important;}
.claim-success.is-visible{display:block !important;}
.claim-success h3{color:#1C1C2E !important;font-size:1.35rem !important;line-height:1.15 !important;margin:0 0 10px !important;font-weight:900 !important;}
.claim-success p{color:#4B5563 !important;font-size:.92rem !important;line-height:1.55 !important;max-width:420px !important;margin:0 auto 16px !important;}
.success-unlocked-label{display:inline-block !important;background:#FFB800 !important;color:#1C1C2E !important;font-size:.72rem !important;font-weight:900 !important;letter-spacing:1.5px !important;text-transform:uppercase !important;padding:7px 11px !important;border-radius:999px !important;margin-bottom:12px !important;}
.claim-success .screenshot-cta{display:inline-flex !important;width:auto !important;min-width:260px !important;justify-content:center !important;text-align:center !important;background:#2D286F !important;border-color:#2D286F !important;color:#fff !important;font-size:16px !important;padding:15px 18px !important;box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 16px rgba(0,0,0,.18) !important;}
.claim-success .screenshot-cta:hover{background:#3A3489 !important;border-color:#3A3489 !important;}
.mindbody-help-note{font-size:.76rem !important;color:#6B7280 !important;margin-top:13px !important;margin-bottom:0 !important;}

/* PARTNER HEADER: large white logo block on the left, CTA pinned right */
.fixed-top-header .promo-banner-new{
  min-height:96px !important;
  height:96px !important;
  padding:0 !important;
  overflow:visible !important;
}
.fixed-top-header .promo-banner-inner{
  position:relative !important;
  width:100% !important;
  overflow:visible !important;
  max-width:none !important;
  min-height:96px !important;
  height:96px !important;
  display:block !important;
}
.fixed-top-header .partner-top-brand{
  position:absolute !important;
  left:18px !important;
  top:50% !important;
  transform:translateY(-50%) !important;
  display:flex !important;
  align-items:center !important;
  justify-content:flex-start !important;
  width:auto !important;
  min-width:0 !important;
  margin:0 !important;
  padding:0 !important;
  background:transparent !important;
  overflow:visible !important;
}
.fixed-top-header .partner-top-logo-img{
  display:block !important;
  height:78px !important;
  width:auto !important;
  max-height:calc(96px - 14px) !important;
  max-width:34vw !important;
  object-fit:contain !important;
  background:transparent !important;
}
.fixed-top-header .topbar-cta-stack{
  position:absolute !important;
  right:18px !important;
  top:50% !important;
  transform:translateY(-50%) !important;
  margin:0 !important;
  display:flex !important;
  flex-direction:column !important;
  align-items:flex-end !important;
  justify-content:center !important;
  text-align:right !important;
  width:auto !important;
  max-width:48vw !important;
}
.fixed-top-header .screenshot-nav{
  min-height:64px !important;
  height:64px !important;
  justify-content:center !important;
}
.fixed-top-header .screenshot-nav .screenshot-nav-links{
  margin:0 auto !important;
}
.fixed-header-spacer{height:160px !important;}

@media(max-width:900px){.screenshot-hero{min-height:auto !important;padding:28px 16px 34px !important;}.partner-hero-shell{grid-template-columns:1fr !important;gap:20px !important;max-width:560px !important;}.partner-hero-copy{text-align:center !important;}.partner-hero-sub{margin-left:auto !important;margin-right:auto !important;}.partner-hero-proof-row{justify-content:center !important;}}
@media(max-width:640px){
.fixed-top-header .promo-banner-new{min-height:100px !important;height:100px !important;padding:0 !important;}
.fixed-top-header .promo-banner-inner{min-height:100px !important;height:100px !important;}
.fixed-top-header .partner-top-brand{left:10px !important;top:50% !important;transform:translateY(-50%) !important;}
.fixed-top-header .partner-top-logo-img{height:72px !important;width:auto !important;max-height:calc(100px - 20px) !important;max-width:38vw !important;}
.fixed-top-header .topbar-cta-stack{right:8px !important;top:50% !important;transform:translateY(-50%) !important;width:min(54vw,250px) !important;max-width:none !important;align-items:stretch !important;}
.fixed-top-header .topbar-cta-stack .promo-claim-btn{width:100% !important;height:48px !important;min-height:48px !important;padding:0 14px !important;font-size:11px !important;text-align:center !important;}
.fixed-top-header .topbar-mindbody-note{width:100% !important;max-width:none !important;text-align:center !important;font-size:10px !important;line-height:1.2 !important;white-space:normal !important;overflow-wrap:normal !important;}
.fixed-top-header .screenshot-nav{min-height:54px !important;height:54px !important;padding:2px 8px !important;}
.fixed-header-spacer{height:146px !important;}
.screenshot-hero{padding:20px 14px 26px !important;}.partner-hero-copy h1{font-size:2.45rem !important;}.partner-hero-sub{font-size:.94rem !important;}.partner-hero-proof-row{display:none !important;}.partner-exclusive-header{padding:0 !important;}.partner-exclusive-header h2{padding:17px 16px 15px !important;}.partner-exclusive-header p{padding:13px 16px 15px !important;}.partner-lead-form{grid-template-columns:1fr !important;padding:18px !important;gap:12px !important;}.claim-success{margin:18px !important;}.claim-success .screenshot-cta{white-space:normal !important;min-width:0 !important;width:100% !important;}}
</style>
`;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPartnerHero(partnerData, isSandsHarbor) {
  const partner = escapeHtml(partnerData.partner);
  const trialType = escapeHtml(partnerData.trialType);
  const trialCost = escapeHtml(partnerData.trialCost);
  const zipCodes = escapeHtml(shared.qualifiedZipCodes);
  const sourceUrl = `https://f45pompano.com/${encodeURIComponent(partnerData.slug)}/`;
  const trialCountMatch = String(partnerData.trialType || "").match(/\d+/);
  const trialCount = trialCountMatch ? trialCountMatch[0] : trialType;
  const leftHeadline = `Reserve Your <span>${trialCount} for ${trialCost} Trial</span>`;
  const leftSub = "Fill out the quick form to unlock your trial offer for F45 Training Pompano Beach.";
  const proofOne = "Strength + Cardio";
  const successHtml = isSandsHarbor
    ? `
      <div id="claimSuccess" class="claim-success" tabindex="-1">
        <div class="success-unlocked-label">Offer unlocked!</div>
        <h3>Your ${partner} exclusive ${trialType} for ${trialCost} offer is unlocked.</h3>
        <p>Thanks — we received your info. Our team will reach out to get you set up, answer any questions, and help book your first class.</p>
        <p class="mindbody-help-note">You can also call/text us at <strong>${escapeHtml(shared.phone)}</strong>.</p>
      </div>`
    : `
      <div id="claimSuccess" class="claim-success" tabindex="-1">
        <div class="success-unlocked-label">Offer unlocked!</div>
        <h3>Your ${partner} exclusive ${trialType} for ${trialCost} offer is ready.</h3>
        <p>Continue to Mindbody to create your account and activate your trial. Eligibility will be verified before your first class.</p>
        <div class="claim-success-actions">
          <a class="screenshot-cta" href="${partnerTrialUrl}" target="_blank" rel="noopener">Continue to Mindbody — ${trialCost} Trial</a>
        </div>
        <p class="mindbody-help-note">Use the same email you entered here. If your account already exists, choose “Forgot Password” or call/text us at ${escapeHtml(shared.phone)}.</p>
      </div>`;

  return `
<section class="screenshot-hero" id="offer">
  <video class="screenshot-hero-video" autoplay muted loop playsinline id="offer-video">
    <source src="/trial-video.mp4" type="video/mp4">
  </video>
  <div class="partner-hero-shell">
    <div class="partner-hero-copy">
      <div class="partner-hero-eyebrow">First-time local residents only</div>
      <h1>${leftHeadline}</h1>
      <p class="partner-hero-sub">${leftSub}</p>
      <div class="partner-hero-proof-row" aria-label="Offer highlights">
        <span>${proofOne}</span><span>Coach-led workouts</span><span>Local Studio</span>
      </div>
    </div>
    <div class="screenshot-offer-card form-overlay-card" id="claim-form">
      <div class="partner-exclusive-header">
        <h2>${partner} Exclusive</h2>
        <p>Submit your info first. Then your exclusive ${trialType} for ${trialCost} offer will unlock.</p>
      </div>
      <form id="partnerLeadForm" class="partner-lead-form overlay-partner-form" action="https://formsubmit.co/ajax/pompanobeach@f45training.com" method="POST">
        <input type="hidden" name="_subject" value="New Partner Lead: ${partner}">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_captcha" value="false">
        <input type="hidden" name="Partner" value="${partner}">
        <input type="hidden" name="Lead Source" value="Partner Website - ${partner}">
        <input type="hidden" name="Offer" value="${trialType} for ${trialCost}">
        <input type="hidden" id="fullNameHidden" name="Full Name" value="">
        <input type="hidden" id="partnerSmsOptInHidden" name="sms_opt_in" value="false">
        <input type="hidden" id="partnerSmsConsentTimestampHidden" name="sms_consent_timestamp" value="">
        <input type="hidden" name="source_url" value="${sourceUrl}">
        <input type="hidden" name="consent_version" value="${partnerConsentVersion}">
        <input type="hidden" name="consent_language" value="${escapeHtml(partnerConsentLanguage)}">
        <div class="form-row"><label for="firstName">First Name *</label><input id="firstName" name="first_name" type="text" autocomplete="given-name" required minlength="2" pattern="[A-Za-z][A-Za-z\\s\\-']{1,}" title="Please enter at least 2 letters."></div>
        <div class="form-row"><label for="lastName">Last Name *</label><input id="lastName" name="last_name" type="text" autocomplete="family-name" required minlength="2" pattern="[A-Za-z][A-Za-z\\s\\-']{1,}" title="Please enter at least 2 letters."></div>
        <div class="form-row"><label for="email">Email *</label><input id="email" name="email" type="email" autocomplete="email" required></div>
        <div class="form-row"><label for="phone">Mobile Phone *</label><input id="phone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="(954) 555-1234" title="Please enter a valid U.S. phone number."></div>
        <div class="form-row full"><label for="zipCode">ZIP Code *</label><input id="zipCode" name="zip_code" type="text" required inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" placeholder="5-digit ZIP code"></div>
        <p class="partner-inquiry-disclosure">By submitting this form, you agree that F45 Training Pompano Beach may contact you by phone or email to respond to your inquiry and help you with this offer.</p>
        <label class="terms-privacy-row"><input id="partnerTermsPrivacy" type="checkbox" name="terms_privacy_acknowledged" value="yes" required><span>I agree to F45 Training Pompano Beach’s <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
        <p id="partnerTermsPrivacyError" class="partner-form-error">Please agree to the Terms &amp; Conditions and acknowledge the Privacy Policy before continuing.</p>
        <label class="eligibility-confirm-row"><input id="partnerEligibilityConfirm" type="checkbox" name="local_residency_eligibility" value="yes" required><span>I confirm that I am a first-time visitor and live in one of these ZIP codes (${zipCodes}), and am able to verify residency for this offer.</span></label>
        <p id="partnerEligibilityError" class="partner-form-error">Please confirm first-time visitor and local residency eligibility before continuing.</p>
        <label class="sms-consent-row"><input id="partnerSmsConsent" type="checkbox" name="sms_consent_checkbox" value="yes"><span>I agree to receive recurring customer care and marketing text messages from F45 Training Pompano Beach at the mobile number provided, including messages sent using automated technology. Message frequency may vary. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a> | <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a></span></label>
        <p class="sms-no-share-note">Your mobile information and SMS opt-in consent will not be sold or shared with third parties for promotional or marketing purposes.</p>
        <button type="submit" class="claim-submit">Submit &amp; Unlock Offer</button>
        <p class="form-small-note">First-time local residents only. Eligibility will be verified before your first class.</p>
      </form>
      ${successHtml}
    </div>
  </div>
</section>

`;
}

function buildPartnerLeadScript(partnerData, isSandsHarbor) {
  const partnerName = JSON.stringify(String(partnerData.partner));
  const trialOffer = JSON.stringify(`${partnerData.trialType} for ${partnerData.trialCost}`);
  const sourceUrl = JSON.stringify(`https://f45pompano.com/${partnerData.slug}/`);
  const phone = JSON.stringify(String(shared.phone));
  const consentLanguage = JSON.stringify(partnerConsentLanguage);
  const submitDefault = JSON.stringify("Submit & Unlock Offer");
  return `
<script>
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("partnerLeadForm");
  const successBox = document.getElementById("claimSuccess");
  if (!form) return;
  function showSuccessBox(){if(!successBox)return;const parent=form.parentNode;if(parent&&successBox.parentNode===parent){parent.insertBefore(successBox,form);}form.remove();successBox.classList.add("is-visible");successBox.setAttribute("tabindex","-1");requestAnimationFrame(function(){successBox.focus({preventScroll:true});const rect=successBox.getBoundingClientRect();const fullyVisible=rect.top>=0&&rect.bottom<=window.innerHeight;if(!fullyVisible){const targetY=window.scrollY+rect.top-Math.max(20,(window.innerHeight-Math.min(rect.height,window.innerHeight-40))/2);window.scrollTo({top:Math.max(0,targetY),left:0,behavior:"smooth"});}});}
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const firstNameField=form.querySelector("#firstName"),lastNameField=form.querySelector("#lastName"),emailField=form.querySelector("#email"),phoneField=form.querySelector("#phone"),zipField=form.querySelector("#zipCode"),termsCheckbox=form.querySelector("#partnerTermsPrivacy"),eligibilityCheckbox=form.querySelector("#partnerEligibilityConfirm"),smsCheckbox=form.querySelector("#partnerSmsConsent"),termsError=form.querySelector("#partnerTermsPrivacyError"),eligibilityError=form.querySelector("#partnerEligibilityError"),fullNameHidden=form.querySelector("#fullNameHidden"),smsOptInHidden=form.querySelector("#partnerSmsOptInHidden"),smsTimestampHidden=form.querySelector("#partnerSmsConsentTimestampHidden");
    const validName=function(value){return /^[A-Za-z][A-Za-z\\s\\-']{1,}$/.test((value||"").trim());};
    if(!validName(firstNameField&&firstNameField.value)){alert("Please enter your full first name with at least 2 letters.");if(firstNameField)firstNameField.focus();return;}
    if(!validName(lastNameField&&lastNameField.value)){alert("Please enter your full last name with at least 2 letters.");if(lastNameField)lastNameField.focus();return;}
    const runtimeLanding=(window.__LANDING_CONFIG__||{}),runtimeGlobal=(runtimeLanding.global||{}),runtimePage={...runtimeGlobal,...(runtimeLanding.page||{})};
    const zipValue=zipField?zipField.value.trim():"";
    if(!/^\\d{5}$/.test(zipValue)){alert("Please enter your 5-digit ZIP code.");if(zipField)zipField.focus();return;}
    if(!termsCheckbox||!termsCheckbox.checked){if(termsError)termsError.style.display="block";if(termsCheckbox)termsCheckbox.focus();return;}if(termsError)termsError.style.display="none";
    if(!eligibilityCheckbox||!eligibilityCheckbox.checked){if(eligibilityError)eligibilityError.style.display="block";if(eligibilityCheckbox)eligibilityCheckbox.focus();return;}if(eligibilityError)eligibilityError.style.display="none";
    if(phoneField){const phoneDigits=phoneField.value.replace(/\\D/g,"");const valid=phoneDigits.length===10||(phoneDigits.length===11&&phoneDigits.charAt(0)==="1");if(!valid){alert("Please enter a valid U.S. phone number so we can contact you about your offer.");phoneField.focus();return;}const normalized=phoneDigits.length===11?phoneDigits.substring(1):phoneDigits;phoneField.value="("+normalized.substring(0,3)+") "+normalized.substring(3,6)+"-"+normalized.substring(6);}
    const fullName=((firstNameField&&firstNameField.value.trim())||"")+" "+((lastNameField&&lastNameField.value.trim())||"");const timestamp=new Date().toISOString();const smsOptIn=!!(smsCheckbox&&smsCheckbox.checked);const normalizedPhoneForPayload=phoneField?phoneField.value.replace(/\\D/g,"").replace(/^1(?=\\d{10}$)/,""):"";
    if(fullNameHidden)fullNameHidden.value=fullName.trim();if(smsOptInHidden)smsOptInHidden.value=smsOptIn?"true":"false";if(smsTimestampHidden)smsTimestampHidden.value=timestamp;
    const submitButton=form.querySelector("button[type='submit']");if(submitButton){submitButton.disabled=true;submitButton.textContent="Submitting...";}
    const partnerName=runtimePage.partner||${partnerName};
    const runtimeOffer=(runtimePage.trialType&&runtimePage.trialCost)?(runtimePage.trialType+" for "+runtimePage.trialCost):${trialOffer};
    const payload={_subject:"New Partner Lead: "+fullName.trim()+" - "+partnerName,_template:"table",_captcha:"false","Lead Source":"Partner Website - "+partnerName,"Offer":runtimeOffer,"Partner":partnerName,"Full Name":fullName.trim(),"first_name":firstNameField?firstNameField.value.trim():"","last_name":lastNameField?lastNameField.value.trim():"","email":emailField?emailField.value.trim():"","phone":normalizedPhoneForPayload,"zip_code":zipValue,"local_residency_eligibility":true,"local_residency_eligibility_timestamp":timestamp,"terms_privacy_acknowledged":true,"terms_privacy_acknowledged_timestamp":timestamp,"terms_privacy_version":"${partnerTermsVersion}","terms_privacy_disclosure":"I agree to F45 Training Pompano Beach’s Terms & Conditions and acknowledge the Privacy Policy.","sms_opt_in":smsOptIn,"sms_consent_timestamp":timestamp,"source_url":window.location.origin+window.location.pathname,"consent_version":"${partnerConsentVersion}","consent_language":${consentLanguage}};
    try{const configuredRecipients=Object.prototype.hasOwnProperty.call(runtimeGlobal,"leadNotificationEmails")?runtimeGlobal.leadNotificationEmails:["pompanobeach@f45training.com"];const notificationEmails=Array.isArray(configuredRecipients)?configuredRecipients.map(function(email){return String(email||"").trim().toLowerCase();}).filter(function(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}):[];if(notificationEmails.length){const primaryEmail=notificationEmails[0],ccEmails=notificationEmails.slice(1);if(ccEmails.length)payload._cc=ccEmails.join(",");const response=await fetch("https://formsubmit.co/ajax/"+primaryEmail,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error("FormSubmit did not accept the submission");}fetch("/api/leads/intake",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({source_type:"partner",source_name:partnerName,source_slug:(runtimeLanding.slug||window.location.pathname.split("/").filter(Boolean).pop()||partnerName),first_name:firstNameField?firstNameField.value.trim():"",last_name:lastNameField?lastNameField.value.trim():"",email:emailField?emailField.value.trim():"",phone:normalizedPhoneForPayload,zip:zipValue,marketing_opt_in:smsOptIn,source_url:window.location.href,offer:runtimeOffer})}).catch(function(){});showSuccessBox();}catch(error){alert("Something went wrong submitting the form. Please call or text us at "+${phone}+" and we’ll help you activate the offer.");if(submitButton){submitButton.disabled=false;submitButton.textContent=${submitDefault};}}
  });
});
</script>
`;
}

function upgradePartnerPage(html, partnerData, options = {}) {
  const isSandsHarbor = !!options.sandsHarbor;
  const heroStart = html.indexOf('<section class="screenshot-hero" id="offer">');
  const heroEnd = html.indexOf("<!-- FIRST CLASS -->", heroStart);
  if(heroStart===-1||heroEnd===-1) throw new Error(`Unable to locate partner hero for ${partnerData.slug}`);
  html=html.slice(0,heroStart)+buildPartnerHero(partnerData,isSandsHarbor)+html.slice(heroEnd);
  html=html.replace(/<style>\s*\/\* Preview-only: use uploaded og-image as fallback background because trial-video\.mp4 was not uploaded here \*\/[\s\S]*?<\/style>\s*/g,"");
  html=html.replace(/<script>\s*document\.addEventListener\("DOMContentLoaded", function \(\) \{\s*const form = document\.getElementById\("partnerLeadForm"\);[\s\S]*?<\/script>\s*(?=<\/body>)/,"");
  html=html.replaceAll(" · Save 50%", "");
  html=html.replaceAll("Save 50%", "");

  // Use the transparent white F45 Training Pompano Beach logo directly on the purple top-left bar.
  const navBrandMatch = html.match(/<div class="screenshot-brand">[\s\S]*?<\/div>/);
  if (navBrandMatch) {
    const topBrand = `<div class="screenshot-brand partner-top-brand" aria-label="F45 Training Pompano Beach">
      <img class="partner-top-logo-img" src="/f45-pompano-logo-white.svg" alt="F45 Training Pompano Beach">
    </div>`;
    html = html.replace(navBrandMatch[0], "");
    html = html.replace(/<div class="promo-code-box">[\s\S]*?<\/div>/, topBrand);
  }
  html=html.replace("</head>",`${partnerRootFormCss}\\n</head>`);
  html=html.replace("</body>",`${buildPartnerLeadScript(partnerData,isSandsHarbor)}\\n</body>`);
  return html;
}

function addLandingRuntime(html) {
  return html.replace("</body>", '<script defer src="/landing-runtime.js?v=4"></script>\\n</body>');
}

function addSiteVersion(html) {
  const badge = `<div class="site-version-badge" aria-label="Site version">${SITE_VERSION}</div>
<style>
.site-version-badge{position:fixed;right:8px;bottom:6px;z-index:20;padding:3px 6px;border-radius:6px;background:rgba(17,24,39,.72);color:rgba(255,255,255,.9);font:700 10px/1.2 Arial,Helvetica,sans-serif;letter-spacing:.2px;pointer-events:none}
@media(max-width:640px){.site-version-badge{font-size:9px;right:5px;bottom:5px;opacity:.78}}
</style>`;
  return html.replace("</body>", badge + "\\n</body>");
}

// Landing Admin defaults are generated from the repository data files so the admin
// always starts from the same values as the deployed static pages.
const landingDefaults = {
  global: {
    qualifiedZipCodes: String(shared.qualifiedZipCodes || "").split(",").map((zip) => zip.trim()).filter(Boolean),
    leadNotificationEmails: ["pompanobeach@f45training.com"],
    defaultVideoUrl: "/trial-video.mp4",
    trialType: generic.genericTrialType,
    trialCost: generic.genericTrialCost,
    trialDuration: generic.genericTrialDuration,
    regularPrice: generic.genericTrialCost,
    firstClassBookingText: "Your first class must be booked within 14 days of purchasing the trial.",
    mindbodyUrl: mindbodyTrialUrl
  },
  pages: [{
    slug: "root",
    pageKind: "root",
    partner: "Main Website",
    promoCode: "",
    trialType: generic.genericTrialType,
    trialCost: generic.genericTrialCost,
    trialDuration: generic.genericTrialDuration,
    firstClassBookingText: "Your first class must be booked within 14 days of purchasing the trial.",
    regularPrice: generic.genericTrialCost,
    percentageSavings: "",
    videoUrl: "",
    mindbodyUrl: mindbodyTrialUrl,
    enabled: true
  }]
};

for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith(".json") || file === "shared.json" || file === "generic.json" || file === "meta.json") continue;
  const page = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  landingDefaults.pages.push({
    slug: page.slug,
    pageKind: "partner",
    partner: page.partner,
    promoCode: page.promoCode || "",
    trialType: page.trialType || "",
    trialCost: page.trialCost || "",
    trialDuration: page.trialDuration || "",
    firstClassBookingText: page.firstClassBookingText || "",
    regularPrice: page.regularPrice || "",
    percentageSavings: page.percentageSavings || "",
    videoUrl: "",
    mindbodyUrl: page.slug === "sands-harbor" ? "" : partnerTrialUrl,
    enabled: true
  });
}
fs.writeFileSync(path.join(distDir, "landing-defaults.json"), JSON.stringify(landingDefaults, null, 2));

// Default homepage
const genericData = { ...shared, ...generic };
const renderedGenericPage = addSiteVersion(addLandingRuntime(addLocalComplianceLinks(addRootLeadCapture(render(genericTemplate, genericData)))));
fs.writeFileSync(path.join(distDir, "index.html"), renderedGenericPage);

// Partner pages
for (const file of fs.readdirSync(dataDir)) {
  if (file === "shared.json") continue;
  if (file === "generic.json") continue;
  if (!file.endsWith(".json")) continue;

  const partner = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  const partnerData = { ...shared, ...partner };

  let renderedPartnerPage = render(
    file === "meta.json" ? metaTemplate :
    file === "sands-harbor.json" ? sandsHarborTemplate :
    partnerTemplate,
    partnerData
  );

  if (file !== "meta.json") {
    renderedPartnerPage = upgradePartnerPage(renderedPartnerPage, partnerData, {
      sandsHarbor: file === "sands-harbor.json"
    });
    renderedPartnerPage = addLandingRuntime(renderedPartnerPage);
  }

  renderedPartnerPage = addSiteVersion(renderedPartnerPage);
  fs.writeFileSync(path.join(distDir, `${partnerData.slug}.html`), renderedPartnerPage);

  const partnerPageDir = path.join(distDir, partnerData.slug);
  fs.mkdirSync(partnerPageDir, { recursive: true });
  fs.writeFileSync(path.join(partnerPageDir, "index.html"), renderedPartnerPage);

  console.log(`Generated ${partnerData.slug}.html`);
}

// Neutral partner template used by /landing/<slug>/ for pages created in Landing Admin.
// Runtime settings replace the neutral values before the visitor interacts with the page.
const dynamicPartnerData = {
  ...shared,
  slug: "landing",
  partner: "Partner",
  promoCode: "",
  trialType: "3 Classes",
  trialCost: "$30",
  trialDuration: "7 days",
  firstClassBookingText: "Your first class must be booked within 14 days of purchasing the trial.",
  regularPrice: "$30",
  percentageSavings: ""
};
let dynamicPartnerPage = upgradePartnerPage(render(partnerTemplate, dynamicPartnerData), dynamicPartnerData);
dynamicPartnerPage = addSiteVersion(addLandingRuntime(dynamicPartnerPage));
const dynamicPartnerDir = path.join(distDir, "_landing-template");
fs.mkdirSync(dynamicPartnerDir, { recursive: true });
fs.writeFileSync(path.join(dynamicPartnerDir, "index.html"), dynamicPartnerPage);
