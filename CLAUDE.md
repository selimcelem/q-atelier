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
Owner: de eigenaar (naam niet publiek)
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

Read REQUIREMENTS.md fully before starting — it contains the complete Phase 3 spec.

---

### Task 1 — Update DynamoDB schema

In modules/database/main.tf, add a new GSI to the bookings table:
- GSI name: token-index
- Hash key: token (S)
- Projection: ALL

Run terraform apply after updating.

---

### Task 2 — Update Lambda: POST /booking (PENDING flow)

In lambda/booking/index.js, change POST /booking so that:
- Booking is written to DynamoDB with status: PENDING (not auto-confirmed)
- A unique token (UUID) is generated and stored with the booking
- token_expires_at is set to 7 days from now (Unix timestamp)
- De eigenaar ontvangt een email met:
  - Customer details: naam, email, telefoon, datum, tijdstip, service
  - Three action links (use the API Gateway endpoint as base URL):
    - Accepteren: GET /action?token=TOKEN&action=accept
    - Nieuw tijdstip voorstellen: GET /reschedule?token=TOKEN
    - Afwijzen: GET /action?token=TOKEN&action=reject
  - Subject: "Nieuwe afspraak aanvraag — [naam] op [datum] om [tijdstip]"
- De eigenaar ontvangt SMS: "Nieuwe afspraak aanvraag: [naam] op [datum] om [tijdstip] voor [service]. Check je mail."
- Customer receives email:
  - Subject: "Uw afspraak aanvraag bij Q-Atelier is ontvangen"
  - Body: "Beste [naam], wij hebben uw aanvraag ontvangen en nemen zo snel mogelijk contact op ter bevestiging."
- Return 200 with message: "Aanvraag ontvangen"

---

### Task 3 — New Lambda endpoints

Add these routes to lambda/booking/index.js:

#### GET /action?token=TOKEN&action=accept|reject

- Look up booking by token using token-index GSI
- Validate token exists and not expired
- Validate token not already used

If action=accept:
- Update DynamoDB status → CONFIRMED
- Send customer confirmation email with .ics attachment (same as original confirmation)
- Send de eigenaar email: "Je hebt de afspraak van [naam] op [datum] om [tijdstip] bevestigd."
- Return HTML page: "Afspraak bevestigd. [naam] ontvangt een bevestiging per e-mail."

If action=reject:
- Update DynamoDB status → CANCELLED
- Send customer email:
  "Beste [naam], helaas kunnen wij uw afspraak op dit moment niet bevestigen.
  De eigenaar neemt zo snel mogelijk contact met u op."
  Include customer phone number and email in de eigenaar's copy.
- Send de eigenaar email with customer naam, email, telefoon, WhatsApp link
- Return HTML page: "Afspraak afgewezen. De klant wordt op de hoogte gesteld."

#### GET /reschedule?token=TOKEN

- Look up and validate booking by token
- Return a simple HTML page (inline in Lambda response) with:
  - Booking details shown at top
  - Date picker input (type=date, min=today)
  - Time slot dropdown: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00
  - Submit button posting to POST /reschedule
  - Styled simply — cream background, readable, mobile friendly

#### POST /reschedule (form submission from above page)

- Parse token, new_date, new_time_slot from form body
- Validate token, validate new slot not already booked
- Update DynamoDB: status → RESCHEDULED, suggested_date, suggested_time_slot
- Generate new customer_token (UUID) for customer response links
- Send customer email:
  - "Beste [naam], helaas zijn wij op [originele datum] om [originele tijdstip] niet beschikbaar."
  - "Wij stellen voor: [nieuwe datum] om [nieuwe tijdstip]."
  - Two buttons:
    - Accepteren: GET /respond?token=CUSTOMER_TOKEN&action=accept
    - Afwijzen: GET /respond?token=CUSTOMER_TOKEN&action=reject
- Send de eigenaar email: "Je hebt een nieuw tijdstip voorgesteld aan [naam]: [nieuwe datum] om [nieuwe tijdstip]."
- Return HTML page: "Nieuw tijdstip voorgesteld. De klant ontvangt een e-mail."

#### GET /respond?token=CUSTOMER_TOKEN&action=accept|reject

- Look up booking by token
- Validate token, not expired, not used

If action=accept:
- Update DynamoDB status → CONFIRMED
- Customer gets confirmation email with .ics for the NEW suggested date/time
- De eigenaar ontvangt email: "[naam] heeft het nieuwe tijdstip geaccepteerd: [nieuwe datum] om [nieuwe tijdstip]." + .ics
- Return HTML: "Bevestigd! U ontvangt een bevestiging per e-mail."

If action=reject:
- Update DynamoDB status → CANCELLED
- Customer gets email: "Helaas. Neem contact op met ons via [phone] of [email] om een passend tijdstip te vinden."
- De eigenaar ontvangt email: "[naam] heeft het nieuwe tijdstip afgewezen."
  Include: naam, email, telefoon, WhatsApp link: https://api.whatsapp.com/send?phone=[phone]
- Return HTML: "Begrepen. Q-Atelier neemt contact met u op."

---

### Task 4 — Add new API Gateway routes

In modules/api/main.tf add:
- GET /action
- GET /reschedule
- POST /reschedule
- GET /respond

All routed to the same Lambda function. Add OPTIONS methods with CORS for POST /reschedule.
Run terraform apply after updating.

---

### Task 5 — Update frontend success message

In frontend/public/main.js, change the success message after booking from:
"Bedankt! Check je e-mail voor de bevestiging."
to:
"Bedankt voor uw aanvraag! Wij bevestigen uw afspraak zo snel mogelijk per e-mail."

Redeploy frontend to S3 and invalidate CloudFront cache.

---

### Task 6 — Package and deploy Lambda
```bash
cd lambda/booking
npm install uuid
cd ../..
Compress-Archive -Path "lambda/booking/*" -DestinationPath "lambda-booking.zip" -Force
aws lambda update-function-code --function-name q-atelier-booking --zip-file fileb://lambda-booking.zip --region eu-west-1
```

---

### Task 7 — Update BUILD_LOG.md

Document Phase 3 implementation:
- Manual booking flow: PENDING → ACCEPT/REJECT/RESCHEDULE
- Token-based secure action links (UUID, 7 day expiry)
- New endpoints: GET /action, GET /reschedule, POST /reschedule, GET /respond
- DynamoDB token-index GSI added
- Frontend success message updated

---

### Task 8 — Commit everything
```bash
git add .
git commit -m "feat: Phase 3 manual booking confirmation flow"
git push origin main
```