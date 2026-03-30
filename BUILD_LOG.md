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
- Status: **BLOCKED — waiting on de eigenaar's registrar info**

---

## Blocked — waiting on de eigenaar

Cannot proceed with CloudFront deployment until:
- [ ] De eigenaar confirms the domain registrar (TransIP / Hostnet / Mijndomein / other)
- [ ] Login credentials provided
- [ ] We add the ACM DNS validation CNAME records to her domain
- [ ] Cert shows "Issued" in AWS Certificate Manager (us-east-1)

Checklist sent to de eigenaar via WhatsApp as interactive HTML form (`sibel_checklist.html`).

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
- SNS SMS subscription: de eigenaar's phone number
- IAM role: `q-atelier-lambda-role` with least-privilege policy
- ACM certificate: created in `us-east-1`, **pending DNS validation**

CloudFront distribution: **not yet created** (blocked on cert validation)

---

## Phase 2 — Lambda + Frontend (2026-03-29)

### Lambda implementation
- Implemented `GET /slots` — queries DynamoDB `month-index` GSI, generates full month availability map (Mon–Sat, 6 slots/day), marks booked vs available
- Implemented `POST /booking` — validates all fields, checks date not in past, not Sunday, valid slot; conditional DynamoDB write prevents double-booking (409 on conflict)
- Created `lambda/booking/ics.js` — generates iCalendar (.ics) with ORGANIZER, ATTENDEE, location, 60-min duration
- Created `lambda/booking/email.js` — sends raw MIME email via SES with .ics attachment (text/calendar; method=REQUEST), BCC to de eigenaar
- SNS SMS notification to de eigenaar on each booking: "Nieuwe afspraak: [name] op [date] om [time_slot] voor [service]"
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
- [x] SNS sends SMS alert to de eigenaar
- [x] Frontend calendar loads slots and allows booking
- [x] Frontend deployed to S3

---

## Phase 3 — SSL, CloudFront & Redesign (2026-03-29)

### ACM certificate validated
- De eigenaar's domain registrar is Vimexx
- Added ACM DNS validation CNAME records to Vimexx DNS panel
- Certificate status changed to "Issued" in AWS Certificate Manager (us-east-1)

### CloudFront deployed with SSL
- CloudFront distribution `E2LJC4OK76HPZO` deployed with real ACM certificate
- Domain aliases configured for `q-atelier.nl` and `www.q-atelier.nl`
- Temporary test URL: `dyshhxdimbjli.cloudfront.net`
- CI/CD fully green — both Terraform and frontend deploy pipelines passing

### Frontend redesign — first attempt (Unsplash images)
- Redesigned with Unsplash background images for hero, service cards, and about section
- **Failed** — Unsplash URLs don't load reliably through CloudFront, broken layout
- Reverted approach

### Frontend redesign — second attempt (CSS only)
- Complete CSS-only redesign of `index.html` and `style.css` — no external images
- Typography: Cormorant Garamond (italic serif headlines) + Jost (clean sans body)
- Palette: deep ivory (#FAF8F5), dusty rose (#C9A99A), champagne gold (#B8973E), charcoal (#2C2623)
- Hero: full-viewport warm cream with decorative CSS borders and dusty rose CTA button
- Intro strip: 3 elegant columns (Persoonlijke begeleiding / Vakkundige pasvorm / Bruidsjurk specialist)
- Service cards: dusty rose top border accent, italic serif headings, CSS-only decorative
- "Over ons" section: text-only, pull quote in Cormorant Garamond italic, decorative dividers
- Calendar restyled — dusty rose selection, faded booked dates, cream available dates
- All booking logic preserved unchanged
- Deployed to S3 + CloudFront cache invalidated

### SES status
- Domain `q-atelier.nl` verified via DKIM in SES
- SES production access requested — awaiting AWS approval
- Until approved, email sending limited to verified addresses only (sandbox mode)

### DNS status
- CloudFront test URL: `dyshhxdimbjli.cloudfront.net` — live and serving the new design
- JouwWeb still live on `q-atelier.nl` — DNS cutover NOT done yet, waiting for de eigenaar approval

---

## Phase 3 — Manual Booking Confirmation Flow (2026-03-30)

### Booking flow change
- Bookings now created with status `PENDING` instead of auto-confirmed
- De eigenaar ontvangt email with customer details + 3 action links (accept/reschedule/reject)
- De eigenaar ontvangt SMS notification to check email
- Customer receives "aanvraag ontvangen" email, no .ics yet

### New Lambda endpoints
- `GET /action?token=TOKEN&action=accept|reject` — de eigenaar accepts or rejects from email
- `GET /reschedule?token=TOKEN` — de eigenaar sees date/time picker form
- `POST /reschedule` — de eigenaar submits new proposed date/time
- `GET /respond?token=CUSTOMER_TOKEN&action=accept|reject` — Customer responds to reschedule proposal

### Token-based security
- UUID token generated per booking, stored in DynamoDB
- Tokens expire after 7 days
- Single-use: once accept/reject is clicked, status changes and token can't be reused
- `token-index` GSI added to DynamoDB for efficient token lookups

### DynamoDB schema additions
- New fields: `status`, `token`, `token_expires_at`, `suggested_date`, `suggested_time_slot`, `customer_token`
- New GSI: `token-index` (hash key: `token`, projection: ALL)

### API Gateway additions
- 4 new routes: GET /action, GET /reschedule, POST /reschedule, GET /respond
- CORS OPTIONS for POST /reschedule
- All routes proxied to same Lambda function

### Frontend update
- Success message changed to: "Bedankt voor uw aanvraag! Wij bevestigen uw afspraak zo snel mogelijk per e-mail."

### Dependencies
- Added `uuid` package to Lambda for token generation

### Bug fixes (2026-03-30)
- Fixed API Gateway "Missing Authentication Token" — added `triggers` block to force new deployment
- De eigenaar notification email now uses HTML with styled action buttons (green/blue/red)
- Removed BCC to de eigenaar on customer confirmation emails (was causing duplicate emails)
- Pure CSS hamburger menu for mobile nav (replaced broken JS toggle)
- Fixed POST /booking: cancelled slots now rebookable (`attribute_not_exists OR status=CANCELLED`)
- Fixed /respond endpoint: added `dynamodb:Scan` to Lambda IAM policy
- Fixed /respond accept: creates new DynamoDB item at suggested date/time (partition key immutable)
- De eigenaar now receives .ics attachment on accept (both direct accept and reschedule accept)
- All email dates now use dd/mm/yyyy format
- Lambda deploy added to GitHub Actions CI/CD pipeline

---

## Phase 4 — Branding, Redesign, Subpages, Availability (2026-03-30)

### Branding
- Renamed "Q — Atelier" / "Q-Atelier" to "Q-atelier" everywhere (frontend, emails, Lambda HTML pages)

### Color palette redesign
- New warm blush palette inspired by damore.nl
- Background: #FDFAF7, accent: #D4A5A5 / #C68B8B, text: #3D2B2B
- Hero background: #F9F0F0, card background: #FBF5F5
- Updated all CSS variables and color references

### Calendar & availability updates
- Day-specific availability slots:
  - Ma: 12:00–17:00 (6 slots), Di/Do/Vr: 10:00–17:00 (7 slots), Za: 12:00–17:00 (6 slots)
  - Wo + Zo: gesloten (no slots)
- Past time slots on today greyed out using Amsterdam timezone (Europe/Amsterdam)
- Wednesday now shown as closed day alongside Sunday
- Opening hours added to contact section

### Contact section icons
- WhatsApp SVG icon (green #25D366) before WhatsApp link
- Instagram SVG icon before Instagram link
- Google Maps pin icon before address, linking to Google Maps

### Email bug fix (reschedule accept)
- De eigenaar now receives a notification email instead of a copy of the customer confirmation
- Subject: "[naam] heeft uw voorgestelde datum geaccepteerd"
- Body includes confirmed date, time, service + .ics attachment
- Added `sendNotificationWithIcs` to email.js

### New subpages
- `diensten.html` — full pricing tables (bruidsjurken, galajurken, broeken, jassen, overige, woningtextiel)
- `over-ons.html` — brand story (Wie zijn wij, Onze werkwijze, Waarom Q-atelier), reviews placeholder
- Navigation updated: Diensten → diensten.html, Over ons → over-ons.html

### Deployment
- Frontend synced to S3, CloudFront cache invalidated
- Lambda redeployed with updated code

---

## TODO — next sessions

### SEO
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
