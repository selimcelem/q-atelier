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

Sibel's feedback: the current design is too vanilla. She wants romantic, chique, elegant.
Think high-end Parisian bridal boutique. Not generic small business.

Redesign frontend/public/index.html, frontend/public/style.css, frontend/public/main.js completely.

Design direction:
- Typography: Cormorant Garamond (serif, italic for headlines) + Jost or similar clean sans for body
  Load from Google Fonts
- Colors: deep ivory/cream background (#FAF8F5), dusty rose accents (#C9A99A),
  champagne gold details (#B8973E), deep charcoal text (#2C2623)
- Layout: full-width hero with elegant overlay text, generous whitespace, refined details
- Buttons: thin bordered, minimal, elegant hover effects
- Calendar: keep functionality exactly the same, just restyle to match
- NO gradients, NO drop shadows everywhere, NO generic stock photo layouts
- Think: Vera Wang website, not Vistaprint

Sections (keep all existing content and functionality):
1. Header — minimal, logo left "Q — Atelier", nav right (Home, Diensten, Afspraak)
   Thin top border in dusty rose
2. Hero — full viewport height, elegant headline in Cormorant Garamond italic,
   "De perfecte pasvorm voor jouw droomjurk."
   Subline: "Thuisatelier in Zeist — maatwerk met zorg en precisie"
   CTA button: "Plan een afspraak" — thin border style
   Background: use this Unsplash image as hero background:
   https://images.unsplash.com/photo-1519741497674-611481863552?w=1600
   Dark overlay on top so text is readable
3. Services — three elegant cards with images
   - Bruidsjurk vermaken: https://images.unsplash.com/photo-1594552072238-b8a33785b6cd?w=800
   - Dagelijkse kleding repareren: https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800
   - Maatwerk op aanvraag: https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800
4. Over ons — short intro about Sibel and the atelier, warm and personal tone
   Image: https://images.unsplash.com/photo-1597940303711-b1f3b8a4c7e4?w=800
5. Booking section — same functionality, elegant restyled calendar
   Month/year in Cormorant Garamond, available dates subtle cream cards,
   booked dates very faded, selected date in dusty rose
6. Contact — clean, minimal, address + phone + email + Instagram + WhatsApp
7. Footer — minimal, one line, copyright Q-Atelier 2026

Keep window.API_ENDPOINT exactly as it is — do not change the API endpoint value.
Keep all booking logic in main.js exactly as it is — only restyle, do not break functionality.

---

### Task 2 — Deploy

Sync the redesigned frontend to S3:
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
- SES sandbox still active — production access blocked until domain is verified via DNS
- Frontend redesign completed — romantic bridal aesthetic
- CloudFront test URL: dyshhxdimbjli.cloudfront.net (JouwWeb still live on q-atelier.nl)
- DNS cutover to CloudFront NOT done yet — waiting for Sibel approval

---

### Task 4 — Commit everything
```bash
git add .
git commit -m "feat: romantic bridal redesign with placeholder images"
git push origin main
```