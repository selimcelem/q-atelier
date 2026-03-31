# Build Log — Q-Atelier

Running log of everything built, what worked, what failed, and why.

---

## Phase 1 — Foundation (2026-03-29)

### Bootstrap — Terraform remote state
- Created S3 bucket + DynamoDB lock table for Terraform state backend
- Ran `terraform init && terraform apply` from `bootstrap/` locally
- Backend connected successfully, all 4 modules loaded

### Repo setup
- Initialized git repo with full scaffold
- Pushed to GitHub (private)
- Switched from SSH to HTTPS remote (SSH key not configured on this machine)

### GitHub Actions CI/CD
- Workflow at `.github/workflows/deploy.yml`
- Terraform plan on PR, apply on merge to main
- Added AWS credentials and Terraform variables as GitHub Secrets

### GitHub Actions — failed runs (learning log)

| Run | Failure | Root Cause | Fix |
|-----|---------|------------|-----|
| #1 | Configure AWS credentials | Secrets not yet added to repo | Added all secrets |
| #2 | Terraform Init | Variable blocks used invalid single-line syntax | Rewrote as multi-line blocks |
| #3 | Terraform Format Check | `main.tf` not canonically formatted | Ran `terraform fmt -recursive` |
| #4 | Terraform Apply | `InvalidViewerCertificate` — ACM cert pending DNS validation | Blocked: waiting on DNS access |

### Blocked on DNS validation
- ACM certificate created in us-east-1 (required by CloudFront)
- DNS validation CNAMEs needed at domain registrar
- Blocked until registrar access provided by client

### Partial deployment (before CloudFront)
Resources created successfully despite CloudFront failure:
- S3 bucket (private, versioning enabled)
- DynamoDB table (PAY_PER_REQUEST, TTL enabled)
- API Gateway + Lambda (stub)
- SES email identities (initial approach, later replaced)
- IAM role with least-privilege policy
- ACM certificate (pending validation)

---

## Phase 2 — Lambda + Frontend (2026-03-29)

### Lambda implementation
- `GET /slots` — queries DynamoDB GSI, generates full month availability map, marks booked vs available
- `POST /booking` — validates fields, checks date not in past, conditional DynamoDB write prevents double-booking (409 on conflict)
- `.ics` generator — iCalendar format with ORGANIZER, ATTENDEE, location, 60-min duration
- Email module — sends MIME email with .ics attachment (text/calendar; method=REQUEST)
- Deployed via `aws lambda update-function-code`

### Frontend
- Single-page site: header, hero, services (3 cards), booking calendar, contact, footer
- Warm bridal design: cream/blush/gold palette, Playfair Display + Inter fonts, responsive
- Interactive calendar with month navigation, date/slot picker, booking form with loading states
- Deployed to S3 via `aws s3 sync` (HTML with no-cache, assets with 1-year cache)

---

## Phase 3 — SSL, CloudFront & Redesign (2026-03-29)

### ACM certificate validated
- Client's domain registrar identified (Vimexx)
- Added ACM DNS validation CNAME records
- Certificate status: Issued

### CloudFront deployed with SSL
- Distribution deployed with real ACM certificate
- Domain aliases configured for q-atelier.nl and www.q-atelier.nl
- CI/CD fully green — both Terraform and frontend deploy pipelines passing

### Frontend redesign attempts

**Attempt 1 — Unsplash images:** Failed. External image URLs don't load reliably through CloudFront. Reverted.

**Attempt 2 — CSS-only redesign:** Success.
- Typography: Cormorant Garamond (italic serif headlines) + Jost (clean sans body)
- Palette: deep ivory, dusty rose, champagne gold, charcoal
- Hero: full-viewport warm cream with decorative CSS borders
- Service cards: dusty rose top border accent, italic serif headings
- Calendar restyled to match palette

### SES status (later replaced by Resend)
- Domain verified via DKIM in SES
- **SES production access requested — rejected by AWS**
- This forced the migration to Resend (see Phase 5)

---

## Phase 3b — Manual Booking Confirmation Flow (2026-03-30)

### Architecture change
- Bookings now created with status `PENDING` instead of auto-confirmed
- Owner receives HTML email with accept/reschedule/reject action buttons
- Customer receives "request received" email (no .ics yet)

### New Lambda endpoints
- `GET /action` — owner accepts or rejects from email
- `GET /reschedule` — owner sees date/time picker form
- `POST /reschedule` — owner submits new proposed date/time
- `GET /respond` — customer responds to reschedule proposal

### Token-based security
- UUID token generated per booking, stored in DynamoDB
- 7-day expiry, single-use (status change invalidates the token)
- `token-index` GSI for efficient token lookups

### Bug fixes (2026-03-30)
- Fixed API Gateway "Missing Authentication Token" — added `triggers` block for redeployment
- Owner notification email: HTML with styled action buttons (green/blue/red)
- Removed BCC to owner on customer confirmations (was causing duplicates)
- Pure CSS hamburger menu for mobile nav (replaced broken JS toggle)
- Cancelled slots now rebookable (conditional expression: `attribute_not_exists OR status=CANCELLED`)
- Fixed `/respond` endpoint: added `dynamodb:Scan` to Lambda IAM policy
- Fixed `/respond` accept: creates new DynamoDB item at suggested date (partition key immutable)
- Owner receives .ics attachment on accept (both direct and reschedule)
- All email dates normalized to dd/mm/yyyy format
- Lambda deploy step added to GitHub Actions pipeline

---

## Phase 4 — Branding, Redesign, Subpages, Availability (2026-03-30)

### Privacy cleanup
- Replaced owner's personal name with role references across all files
- Variable names (environment config) left unchanged for backwards compatibility

### Color palette redesign
- Warm blush palette: background #FDFAF7, accent #D4A5A5 / #C68B8B, text #3D2B2B
- Hero background: #F9F0F0, card background: #FBF5F5

### Hero video background
- Fullscreen background video with semi-transparent overlay for text readability
- White text and CTA button with z-index layering
- Fallback cream background if video fails to load
- S3 deploy commands updated with `--exclude "video/*"`

### Calendar & availability updates
- Day-specific availability slots (Mon/Sat: 6 slots, Tue/Thu/Fri: 7 slots, Wed/Sun: closed)
- Past time slots greyed out using Amsterdam timezone (`Europe/Amsterdam`)
- Opening hours added to contact section

### Contact section icons
- WhatsApp SVG icon (#25D366), Instagram SVG icon, Google Maps pin icon
- All 20x20px, vertically aligned with text

### Email bug fix (reschedule accept)
- Owner now receives notification email instead of copy of customer confirmation
- Includes confirmed date, time, service + .ics attachment

### New subpages
- `diensten.html` — full pricing tables (bruidsjurken, galajurken, broeken, jassen, overige, woningtextiel)
- `over-ons.html` — brand story, client reviews placeholder
- Navigation updated across all pages

### SNS SMS (removed)
- Phone number verified in SNS sandbox
- SMS quota increase requested, sandbox exit case submitted
- AWS never approved sandbox exit — feature dropped entirely

### SES production access (rejected)
- Support case submitted with additional info
- AWS rejected production access — migrated to Resend

---

## Phase 5 — Polish, Email Migration, Photos (2026-03-31)

### SVG ring divider
- Inline SVG decorative ring divider between hero and intro sections
- CSS z-index layering for overlap effect with blend modes

### Email migration: SES → Resend
- SES sandbox limitations blocking production delivery
- Installed `resend` npm package, rewrote email module
- All email functions preserved (booking, plain, HTML, notification with .ics)
- .ics attachments via Resend's `attachments` array
- Emails sent from `Q-Atelier <info@q-atelier.nl>` (domain verified in Resend)

### Review & About Us photos
- Customer review screenshots and atelier photos uploaded to S3
- Photo grids on about page (3-column desktop, 1-column mobile, hover effects)
- Native `<dialog>` lightbox for clickable photo expansion
- S3 sync commands updated with folder excludes to prevent deletion of S3-only assets

### Scroll animations
- Intersection Observer-based scroll animations on all pages
- Fade-in and slide-up effects on section load

### Pricing updates
- Updated pricing across all categories (bruidsjurken, galajurken, broeken, jassen, overige, woningtextiel)
- Jacket zipper prices corrected: korte jas €35, winterjas €40

### Diensten intro section
- Added intro section with images to diensten page
- Mobile-responsive card layout

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| IaC | Terraform | Industry standard, job market, multi-cloud |
| State backend | S3 + DynamoDB | Standard pattern, free tier |
| DNS | Existing registrar (not Route 53) | Free, Route 53 adds no SEO benefit |
| SSL cert region | us-east-1 | Required by CloudFront |
| Frontend | Vanilla HTML/CSS/JS | No build tooling for a simple site |
| Calendar invites | `.ics` iCalendar format | Native on iPhone, Android, Gmail, Outlook |
| Email sender | Resend (was SES) | Simple API, free tier, no sandbox limitations |
| SMS | Removed (was SNS) | Sandbox never approved, feature dropped |
| CI/CD | GitHub Actions | Free, Terraform plan on PR / apply on merge |

---

## Costs

AWS free tier — all resources within limits. Expected ongoing cost: ~€0/month.
ACM: free. Resend: free tier (3,000 emails/month).
