# Candidate evaluation PDF + durable records

Changes made:
- Candidate evaluation form posts to /api/candidate-evaluation/submit.
- Server generates a PDF report containing every score and note, modeled on the F45 100-point scorecard.
- Submission is inserted into a dedicated D1 table before any email is attempted.
- A short email is sent with the PDF attachment via the existing leads-trials credentials through the shared email gateway.
- The database stores both the complete JSON answers and the generated PDF base64 for later retrieval.
- On email failure, the record remains saved, with email_state='failed', and the form shows a warning rather than claiming email success.

**Required Cloudflare setup before use**

1. Create a D1 database named `f45-candidate-evaluations` in the Cloudflare account hosting f45pompano.com.
2. In the existing F45 Pages project, Settings > Bindings, add a D1 database binding named **CANDIDATE_EVAL_DB** pointing to the new database. Apply to production.
3. In D1 console for that database, execute `migrations/candidate_evaluations.sql` from this repo.
4. Redeploy the F45 Pages project to activate the binding.
5. Deploy the updated `f45-pompanobeach/email-gateway` Worker source. It adds optional PDF attachments in Brevo/Mailjet/Resend adapters; it does not change email requests without attachments.
6. Run a test evaluation and confirm both the email attachment and a D1 record with email_state='accepted'. Do not treat gateway accepted as proof of final inbox delivery.

**Security:** The evaluation form currently does not require a passcode. Apply Cloudflare Access or another authentication layer before allowing sensitive interview records to be submitted from an untrusted/public link. Never expose D1 database records to unauthenticated visitors. D1 records include sensitive candidate notes; limit access to studio management. No public listing/retrieval endpoint has been added.

**Operational caveat:** Until the D1 binding and SQL schema exist, the submission endpoint returns an error rather than sending unsaved evaluations. Keep existing submissions safe separately. Existing gateway sends remain unaffected by optional attachments.
