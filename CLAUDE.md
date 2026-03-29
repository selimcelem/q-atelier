# CLAUDE.md — Q-Atelier Project Context

This file is read automatically by Claude Code. Read it fully before doing anything.

## What this is

A production AWS static site + booking system for q-atelier.nl, a bridal dress tailoring
atelier in Zeist, Netherlands. Built with Terraform + vanilla JS. Also a portfolio project
for the developer (AWS SAA-C03 candidate, career switching from BIM to Cloud Engineering).

## Stack

- IaC: Terraform (remote state on S3, lock on DynamoDB)
- Hosting: S3 + CloudFront + ACM — DEPLOYED
- API: API Gateway + Lambda (Node.js 20) — DEPLOYED
- Database: DynamoDB — DEPLOYED
- Email: SES with .ics attachment — DEPLOYED (sandbox mode)
- SMS: SNS — DEPLOYED
- Frontend: Vanilla HTML/CSS/JS (no build tooling)
- Language: Dutch (nl)

## What is deployed in AWS

- S3 bucket: q-atelier-site
- CloudFront distribution: E2LJC4OK76HPZO (test URL: dyshhxdimbjli.cloudfront.net)
- ACM cert: issued and attached to CloudFront
- DynamoDB table: q-atelier-bookings
- API Gateway: q-atelier-api (stage: prod)
- API endpoint: https://apqc7wkzj6.execute-api.eu-west-1.amazonaws.com/prod
- Lambda: q-atelier-booking (GET /slots + POST /booking fully implemented)
- SES identity: q.atelier89@gmail.com (verified, sandbox mode)
- SNS topic: q-atelier-booking-alerts

## Business details

Name: Q-Atelier
Owner: Sibel Celem
Address: Laan van Vollenhove 159, 3706 CD Zeist, Nederland
Phone: +31 6 85 56 95 51
Email: q.atelier89@gmail.com
Instagram: https://instagram.com/q_atelier_
WhatsApp: https://api.whatsapp.com/send?phone=31685569551
Opening hours: maandag t/m zaterdag 08:00 – 19:00, zondag gesloten

## Conventions

- Never add Co-authored-by or any Claude/Anthropic attribution to commits
- All user-facing text in Dutch
- IAM least-privilege, no hardcoded secrets
- .ics format for calendar invites (not CSV)
- Appointment duration: 60 minutes
- Available slots: Mon-Sat 10:00 11:00 13:00 14:00 15:00 16:00
- Sunday: closed
- window.API_ENDPOINT in index.html must never be changed

## Key files

- `REQUIREMENTS.md` — full product requirements including Phase 3 booking flow
- `BUILD_LOG.md` — running log of everything built and deployed
- `modules/hosting/main.tf` — S3 + CloudFront + ACM
- `modules/api/main.tf` — API Gateway + Lambda
- `modules/database/main.tf` — DynamoDB
- `modules/notifications/main.tf` — SES + SNS
- `lambda/booking/index.js` — Lambda handler
- `lambda/booking/ics.js` — .ics generator
- `lambda/booking/email.js` — SES email helper
- `frontend/public/` — static site files

## TONIGHT'S MISSION

Work through these tasks completely and autonomously. Make reasonable decisions without
stopping to ask questions. Never add Co-authored-by or any Claude/Anthropic attribution
to commits. Commit after each completed task with a descriptive message.

---

### Task 1 — Redesign the frontend

Sibel's feedback: current design is too vanilla. She wants romantic, chique, elegant.
Think high-end Parisian bridal boutique. Not generic small business.

Redesign frontend/public/index.html, frontend/public/style.css, frontend/public/main.js completely.

IMPORTANT CONSTRAINTS:
- NO external images — Unsplash URLs don't load reliably on CloudFront. CSS only.
- NO broken layouts — test every section renders correctly before deploying
- Keep window.API_ENDPOINT exactly as it is — never change this value
- Keep all booking logic in main.js exactly as it is — only restyle, never break functionality

Design direction:
- Typography: Cormorant Garamond (serif, italic for headlines) + Jost for body — Google Fonts
- Colors: ivory/cream background (#FAF8F5), dusty rose accent (#C9A99A),
  champagne gold details (#B8973E), deep charcoal text (#2C2623)
- Buttons: thin bordered, minimal, elegant hover effects
- Generous whitespace, refined details
- Think: Vera Wang website aesthetic

Sections:
1. Header — sticky, minimal. Logo left "Q — Atelier" in Cormorant Garamond.
   Nav right: Home, Diensten, Over ons, Afspraak. Thin dusty rose bottom border.

2. Hero — full viewport height. CSS only, no image.
   Warm cream background with subtle decorative elements (CSS borders, thin lines).
   Large italic Cormorant Garamond headline: "De perfecte pasvorm voor jouw droomjurk."
   Subline in Jost light: "Thuisatelier in Zeist — maatwerk met zorg en precisie"
   CTA button: "Plan een afspraak" — thin bordered, dusty rose

3. Intro strip — 3 columns, elegant icons (unicode or CSS), short text:
   "Persoonlijke begeleiding" / "Vakkundige pasvorm" / "Bruidsjurk specialist"

4. Services — 3 cards, CSS only, no images.
   Each card: decorative top border in dusty rose, serif heading, short description.
   - Bruidsjurk vermaken & aanpassen
   - Dagelijkse kleding repareren
   - Maatwerk op aanvraag

5. Over ons — text only, no image. Warm personal intro about Sibel.
   Decorative divider line. Italic pull quote in Cormorant Garamond.

6. Booking section #afspraak — keep ALL existing functionality from main.js.
   Restyle only: Cormorant Garamond month/year header, cream date cards,
   faded booked slots, dusty rose selected state, elegant form fields.

7. Contact — address, phone, email, Instagram link, WhatsApp button.
   Clean minimal layout.

8. Footer — one line. "© 2026 Q-Atelier — Zeist" centered.

---

### Task 2 — Deploy

Sync to S3:
```bash
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html"
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --include "*.html"
```

Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id E2LJC4OK76HPZO \
  --paths "/*"
```

---

### Task 3 — Update BUILD_LOG.md

Document everything that happened today:
- ACM cert validated after adding CNAME records to Vimexx DNS
- CloudFront deployed with real SSL cert and domain aliases (q-atelier.nl + www)
- CI/CD fully green — Terraform plan/apply + frontend deploy both passing
- SES sandbox still active — production access blocked until domain verified via DNS
- First redesign attempt failed — Unsplash images not loading, layout broken
- Second redesign: CSS-only approach, no external images
- CloudFront test URL: dyshhxdimbjli.cloudfront.net
- JouwWeb still live on q-atelier.nl — DNS cutover NOT done, waiting for Sibel approval

---

### Task 4 — Commit
```bash
git add .
git commit -m "feat: elegant CSS-only bridal redesign"
git push origin main
```