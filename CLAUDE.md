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
- Email: Resend with .ics attachment — DEPLOYED
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
- Email: Resend (from info@q-atelier.nl, RESEND_API_KEY in Lambda env)
- SNS topic: q-atelier-booking-alerts

## Business details

Name: Q-Atelier
Owner: de eigenaar (naam niet publiek)
Address: Laan van Vollenhove 159, 3706 CD Zeist, Nederland
Phone: +31 6 85 56 95 51
Email: q.atelier89@gmail.com
Instagram: https://instagram.com/q_atelier_
WhatsApp: https://api.whatsapp.com/send?phone=31685569551
Opening hours: Ma 12:00–18:00 · Di 10:00–18:00 · Wo gesloten · Do 10:00–18:00 · Vr 10:00–18:00 · Za 12:00–18:00 · Zo gesloten

## Conventions

- Never add Co-authored-by or any Claude/Anthropic attribution to commits
- All user-facing text in Dutch
- IAM least-privilege, no hardcoded secrets
- .ics format for calendar invites (not CSV)
- Appointment duration: 60 minutes
- Available slots: day-specific (see SLOTS_BY_DAY in lambda/booking/index.js)
- Wednesday + Sunday: closed
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
- `lambda/booking/email.js` — Resend email helper
- `frontend/public/` — static site files

### TODAY'S MISSION

Work through these tasks completely and autonomously. Make reasonable decisions without
stopping to ask questions. Never add Co-authored-by or any Claude/Anthropic attribution
to commits. Commit after each completed task with a descriptive message.
Mark each completed task in TASKS.md with [x].

---

### Task 1 — Branding: rename Q — Atelier to Q-atelier

In frontend/public/index.html, style.css, main.js:
- Replace all instances of "Q — Atelier" with "Q-atelier"
- Replace all instances of "Q-Atelier" with "Q-atelier"
- The logo should read "Q-atelier" everywhere

---

### Task 2 — Fix: past dates and times greyed out

In frontend/public/main.js, in the calendar and slot rendering logic:
- Past dates (before today): grey out entirely, not clickable
- Today's date: grey out any time slots that are in the past based on current time
  e.g. if it's 15:00, slots 10:00, 11:00, 13:00, 14:00 should be greyed out
- Use Amsterdam timezone (Europe/Amsterdam) for time comparisons

---

### Task 3 — Fix: email bug on reschedule accept

In lambda/booking/index.js, in the GET /respond?action=accept handler:
Currently de eigenaar gets a copy of the customer confirmation email.
Fix: de eigenaar should get a simple notification email:
Subject: "[naam] heeft uw voorgestelde datum geaccepteerd"
Body: "De klant heeft uw voorgestelde datum geaccepteerd: [suggested_date dd/mm/yyyy] om [suggested_time_slot] voor [service]. De klant ontvangt een bevestigingsmail met .ics bijlage."
Attach .ics for the confirmed new date to this email.

---

### Task 4 — Update availability slots

In lambda/booking/index.js, replace the ALLOWED_SLOTS and day logic with:
- Maandag (1): 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Dinsdag (2): 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Woensdag (3): GESLOTEN — no slots
- Donderdag (4): 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Vrijdag (5): 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Zaterdag (6): 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Zondag (0): GESLOTEN — no slots

Also update the GET /slots handler to return the correct slots per day of week.
Also update the opening hours in frontend/public/index.html contact section:
Ma 12:00–18:00 · Di 10:00–18:00 · Wo gesloten · Do 10:00–18:00 · Vr 10:00–18:00 · Za 12:00–18:00 · Zo gesloten

---

### Task 5 — Contact section: icons

In frontend/public/index.html and style.css:
- Add WhatsApp icon before the WhatsApp link — use SVG inline icon (green #25D366)
- Add Instagram icon before the Instagram link — use SVG inline icon
- Add Google Maps icon before the address, linking to:
  https://maps.google.com/?q=Laan+van+Vollenhove+159,+3706+CD+Zeist
- All icons should be 20x20px, vertically aligned with text

---

### Task 6 — Design: damore.nl inspired color palette

Redesign the color palette in frontend/public/style.css to be more romantic and warm.
Reference: https://damore.nl/damore-arnhem/ — light pink, white, blush, soft beige.

New palette:
- Background: #FDFAF7 (warm white)
- Primary accent: #D4A5A5 (soft blush pink)
- Secondary accent: #C68B8B (deeper rose)
- Text: #3D2B2B (dark warm brown)
- Muted text: #8B6B6B (warm grey-brown)
- Card background: #FBF5F5 (blush white)
- Border: #E8D5D5 (light pink border)
- Button background: #C68B8B
- Button hover: #B57A7A
- Hero background: #F9F0F0

Update all CSS variables and color references throughout style.css.
Keep the same layout and structure — only colors change.

---

### Task 7 — Add Diensten subpage

Create frontend/public/diensten.html with:
- Same header and footer as index.html
- Full pricing tables from TASKS.md (all categories)
- Elegant layout matching the main site design
- Intro text: "Bij Q-atelier verzorgen wij vakkundig maatwerk en aanpassingen voor bruidsjurken, galajurken, dagelijkse kleding en woningtextiel. Hieronder vindt u een overzicht van onze tarieven."
- Note at bottom: "Alle genoemde prijzen zijn vanaf-prijzen. De uiteindelijke prijs kan variëren afhankelijk van de complexiteit van de werkzaamheden. Neem contact op voor een exacte prijsopgave."
- Link back to home and to afspraak section

---

### Task 8 — Add Over ons subpage

Create frontend/public/over-ons.html with:
- Same header and footer as index.html
- Brand story in Dutch using "wij/ons" — no personal names
- Sections: Wie zijn wij, Onze werkwijze, Waarom Q-atelier
- Placeholder section for client reviews (empty for now, styled nicely)
- Appointment info: "Een eerste afspraak voor bruidsjurken duurt gemiddeld anderhalf uur. Bij overige kleding is de duur afhankelijk van de werkzaamheden."
- Link to booking section on index.html

---

### Task 9 — Update navigation links

In frontend/public/index.html:
- "Diensten" nav link → href="diensten.html"
- "Over ons" nav link → href="over-ons.html"
- Update mobile nav as well

---

### Task 10 — Deploy everything

Sync frontend to S3:
```bash
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html" --exclude "video/*" \
  --exclude "About us/*" --exclude "Review pictures/*"
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --exclude "*" --include "*.html"
```

Invalidate CloudFront:
```bash
aws cloudfront create-invalidation \
  --distribution-id E2LJC4OK76HPZO \
  --paths "/*"
```

Redeploy Lambda:
```bash
cd lambda/booking && npm install && cd ../..
Compress-Archive -Path "lambda/booking/*" -DestinationPath "lambda-booking.zip" -Force
aws lambda update-function-code --function-name q-atelier-booking --zip-file fileb://lambda-booking.zip --region eu-west-1
```

---

### Task 11 — Update TASKS.md and commit

Mark all completed tasks as [x] in TASKS.md.
Update BUILD_LOG.md with today's changes.
```bash
git add .
git commit -m "feat: branding, redesign, subpages, availability, icons, bug fixes"
git push origin main
```