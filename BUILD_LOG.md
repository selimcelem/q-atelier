# Build Log — Q-Atelier

Running log of everything done, what worked, what failed, and why.

---

## 2026-03-29

### Bootstrap — Terraform remote state
- Created `bootstrap/main.tf` with S3 bucket + DynamoDB lock table
- Ran `terraform init && terraform apply` from `bootstrap/` locally
- **Result:** S3 bucket `q-atelier-terraform-state` and DynamoDB table `q-atelier-terraform-lock` created successfully in `eu-west-1`
- Filled in `main.tf` backend block with output values

---

### Repo setup
- Created `D:\Projects\q-atelier` with full scaffold
- Initialized git, pushed to `https://github.com/selimcelem/q-atelier` (private)
- Switched from SSH to HTTPS remote (SSH key not configured on this machine)
- CRLF warnings on Windows are harmless, ignored

---

### Terraform init (root)
- Ran `terraform init` from project root
- S3 backend connected successfully
- All 4 modules loaded: `hosting`, `api`, `database`, `notifications`
- Providers installed: `hashicorp/aws v5.100.0`, `hashicorp/archive v2.7.1`
- Lock file `.terraform.lock.hcl` committed to repo

---

### GitHub Actions setup
- Workflow at `.github/workflows/deploy.yml`
- Added secrets to repo: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `TF_VAR_DOMAIN_NAME`, `TF_VAR_SIBEL_EMAIL`, `TF_VAR_SIBEL_PHONE`, `TF_VAR_SES_FROM_EMAIL`
- Note: `SITE_BUCKET_NAME` and `CLOUDFRONT_DISTRIBUTION_ID` cannot be added yet — only known after first successful `terraform apply`

---

### GitHub Actions — failed runs

**Run #1 — "feat: initial project scaffold"**
- Failed at: Configure AWS credentials
- Reason: Secrets not yet added to repo
- Fix: Added all 6 secrets

**Run #2 — same commit, re-run**
- Failed at: Terraform Init
- Reason: Variable blocks in `modules/api/main.tf` and `modules/notifications/main.tf` used invalid single-line syntax `{ type = string, sensitive = true }`
- Fix: Rewrote as multi-line blocks

**Run #3 — "fix: variable block syntax"**
- Failed at: Terraform Format Check
- Reason: `main.tf` not formatted to Terraform canonical style
- Fix: Ran `terraform fmt -recursive` locally

**Run #4 — "fix: terraform fmt"**
- Failed at: Terraform Apply
- Reason: CloudFront distribution failed with `InvalidViewerCertificate`
- Root cause: ACM certificate exists in `us-east-1` but DNS validation CNAMEs have not been added to the domain registrar yet. CloudFront refuses to use an unvalidated cert.
- Status: **BLOCKED — waiting on Sibel's registrar info**

---

## Blocked — waiting on Sibel

Cannot proceed with CloudFront deployment until:
- [ ] Sibel confirms her domain registrar (TransIP / Hostnet / Mijndomein / other)
- [ ] She provides login credentials
- [ ] We add the ACM DNS validation CNAME records to her domain
- [ ] Cert shows "Issued" in AWS Certificate Manager (us-east-1)

Checklist sent to Sibel via WhatsApp as interactive HTML form (`sibel_checklist.html`).

---

## What's already deployed in AWS (partial apply)

Despite the CloudFront failure, earlier resources were created successfully:
- S3 bucket: `q-atelier-site` (private, versioning enabled)
- DynamoDB table: `q-atelier-bookings` (PAY_PER_REQUEST, TTL enabled)
- API Gateway: `q-atelier-api`
- API Gateway Stage: `prod`
- Lambda function: `q-atelier-booking` (stub — not yet implemented)
- SES email identities: verification emails sent to `q.atelier89@gmail.com`
- SNS topic: `q-atelier-booking-alerts`
- SNS SMS subscription: Sibel's phone number
- IAM role: `q-atelier-lambda-role` with least-privilege policy
- ACM certificate: created in `us-east-1`, **pending DNS validation**

CloudFront distribution: **not yet created** (blocked on cert validation)

---

## Phase 2 — Lambda + Frontend (2026-03-29)

### Lambda implementation
- Implemented `GET /slots` — queries DynamoDB `month-index` GSI, generates full month availability map (Mon–Sat, 6 slots/day), marks booked vs available
- Implemented `POST /booking` — validates all fields, checks date not in past, not Sunday, valid slot; conditional DynamoDB write prevents double-booking (409 on conflict)
- Created `lambda/booking/ics.js` — generates iCalendar (.ics) with ORGANIZER, ATTENDEE, location, 60-min duration
- Created `lambda/booking/email.js` — sends raw MIME email via SES with .ics attachment (text/calendar; method=REQUEST), BCC to Sibel
- SNS SMS notification to Sibel on each booking: "Nieuwe afspraak: [name] op [date] om [time_slot] voor [service]"
- **Deployed** Lambda via `aws lambda update-function-code`

### Frontend
- Rebuilt `index.html` as full single-page site: header, hero, services (3 cards), booking calendar, contact, footer
- Created `style.css` — warm bridal design (cream/blush/gold palette, Playfair Display + Inter fonts, responsive)
- Created `main.js` — interactive calendar with month navigation, date/slot picker, booking form with loading states and error handling
- Set `window.API_ENDPOINT` from `terraform output api_endpoint`
- **Deployed** to S3 via `aws s3 sync` (HTML with no-cache, assets with 1-year cache)

### What's working
- [x] GET /slots returns monthly availability from DynamoDB
- [x] POST /booking creates bookings with double-booking prevention
- [x] SES sends confirmation email with .ics calendar invite
- [x] SNS sends SMS alert to Sibel
- [x] Frontend calendar loads slots and allows booking
- [x] Frontend deployed to S3

---

## TODO — next sessions

### When Sibel's registrar is known
- [ ] Add ACM validation CNAME records at registrar
- [ ] Wait for cert to show "Issued" (~5 min)
- [ ] Re-run `terraform apply` — CloudFront should deploy successfully
- [ ] Add `SITE_BUCKET_NAME` and `CLOUDFRONT_DISTRIBUTION_ID` to GitHub Actions secrets
- [ ] Point domain DNS (A/CNAME) at CloudFront distribution

### Phase 3 — SEO
- [ ] JSON-LD LocalBusiness structured data
- [ ] Sitemap + robots.txt
- [ ] Google Business Profile setup
- [ ] Google Search Console submission

---

## Architecture decisions log

| Decision | Choice | Reason |
|----------|--------|--------|
| IaC | Terraform | Industry standard, job market, multi-cloud |
| State backend | S3 + DynamoDB | Standard pattern, free tier |
| DNS | Existing registrar (not Route 53) | Free, Route 53 has no SEO benefit |
| SSL cert region | us-east-1 | Required by CloudFront |
| Frontend | Vanilla HTML/CSS/JS | No build tooling for a simple site |
| Calendar invites | `.ics` iCalendar format | Native on iPhone, Android, Gmail, Outlook |
| Email sender | SES | Cheapest, supports raw email with attachments |
| SMS | SNS | Simple, free tier sufficient |
| CI/CD | GitHub Actions | Free, Terraform plan on PR / apply on merge |

---

## Costs so far

AWS free tier — all resources within limits. Expected ongoing cost: ~€0/month.
ACM, SES identities, SNS subscriptions: free.
