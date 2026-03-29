# CLAUDE.md — Q-Atelier Project Context

This file is read automatically by Claude Code. Read it fully before doing anything.

## What this is

A production AWS static site + booking system for q-atelier.nl, a bridal dress tailoring
atelier in Zeist, Netherlands. Built with Terraform + vanilla JS. Also a portfolio project
for the developer (AWS SAA-C03 candidate, career switching from BIM to Cloud Engineering).

## Stack

- IaC: Terraform (remote state on S3, lock on DynamoDB)
- Hosting: S3 + CloudFront + ACM (CloudFront pending DNS validation — do not touch)
- API: API Gateway + Lambda (Node.js 20) — DEPLOYED
- Database: DynamoDB — DEPLOYED
- Email: SES with .ics attachment — DEPLOYED
- SMS: SNS — DEPLOYED
- Frontend: Vanilla HTML/CSS/JS (no build tooling)
- Language: Dutch (nl)

## What is already deployed in AWS

- S3 bucket: q-atelier-site
- DynamoDB table: q-atelier-bookings
- API Gateway: q-atelier-api (stage: prod)
- Lambda: q-atelier-booking (stub — needs implementation)
- SES identity: q.atelier89@gmail.com (verified)
- SNS topic: q-atelier-booking-alerts
- IAM role: q-atelier-lambda-role

## What is NOT deployed yet

- CloudFront distribution — blocked on ACM cert DNS validation, do not touch this

## TONIGHT'S MISSION

Work through these tasks completely and autonomously. Make reasonable decisions without
stopping to ask questions. Commit after each completed task with a descriptive message.

---

### Task 1 — Implement Lambda: GET /slots

File: lambda/booking/index.js

GET /slots?month=YYYY-MM

- Query DynamoDB table q-atelier-bookings using the month-index GSI
- month attribute format: YYYY-MM
- Return all slots for the requested month as JSON:
  {
    "2026-04-10": {
      "10:00": "booked",
      "11:00": "available",
      "13:00": "available"
    }
  }
- Default available slots Mon-Sat: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00
- Sunday always closed
- If a slot exists in DynamoDB it is "booked", otherwise "available"
- Return CORS headers on all responses

---

### Task 2 — Implement Lambda: POST /booking

File: lambda/booking/index.js

POST /booking with JSON body:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "date": "YYYY-MM-DD",
  "time_slot": "HH:MM",
  "service": "string"
}

- Validate all fields present and non-empty
- Validate date is not in the past
- Validate day is not Sunday
- Validate time_slot is one of the allowed slots
- Write to DynamoDB with condition expression to prevent double booking
  (ConditionExpression: "attribute_not_exists(date) AND attribute_not_exists(time_slot)")
- Set month attribute to YYYY-MM (for GSI)
- Set expires_at to Unix timestamp 1 year from now (for TTL)
- Generate .ics file content (see Task 3)
- Send SES raw email with .ics attachment to BOTH customer and Sibel
- Publish SNS SMS to Sibel: "Nieuwe afspraak: [name] op [date] om [time_slot] voor [service]"
- Return 200 on success, 409 if slot already booked, 400 on validation error

---

### Task 3 — .ics generator

File: lambda/booking/ics.js

Create a helper module that generates iCalendar (.ics) content.
- Event summary: "Afspraak Q-Atelier — [service]"
- Location: Laan van Vollenhove 159, 3706 CD Zeist
- Duration: 60 minutes
- Include ORGANIZER: q.atelier89@gmail.com
- Include ATTENDEE: customer email
- Use DTSTART/DTEND in UTC
- Return as string

---

### Task 4 — SES email helper

File: lambda/booking/email.js

Create a helper that sends a raw MIME email with .ics attachment via SES.
- To: customer email
- BCC: q.atelier89@gmail.com
- From: q.atelier89@gmail.com
- Subject: "Bevestiging afspraak Q-Atelier — [date] om [time_slot]"
- Body (Dutch):
  "Beste [name], hierbij de bevestiging van uw afspraak bij Q-Atelier.
  Datum: [date], Tijd: [time_slot], Service: [service].
  Adres: Laan van Vollenhove 159, 3706 CD Zeist.
  Tot dan! — Sibel, Q-Atelier"
- Attach the .ics file as calendar invite
- Content-Type: text/calendar; method=REQUEST

---

### Task 5 — Frontend booking calendar

File: frontend/public/index.html + frontend/public/style.css + frontend/public/main.js

Build the full site. Design: warm, elegant, bridal. Dutch language throughout.

Pages/sections on index.html:
1. Header with logo "Q-Atelier" and nav (Home, Diensten, Afspraak)
2. Hero section: "De perfecte pasvorm voor jouw droomjurk" with CTA button
3. Services section: three cards
   - Bruidsjurk vermaken (main service)
   - Dagelijkse kleding repareren
   - Maatwerk op aanvraag
4. Booking section (#afspraak):
   - Month navigation (prev/next arrows)
   - Calendar grid showing current month
   - Available dates clickable, booked dates greyed out, past dates greyed out
   - On date click: show time slot picker for that date
   - On slot click: show booking form
   - Booking form fields: Naam, E-mailadres, Telefoonnummer, Service (dropdown)
   - Submit button: "Afspraak bevestigen"
   - On success: show "Bedankt! Check je e-mail voor de bevestiging."
   - On 409: show "Dit tijdstip is helaas al bezet. Kies een ander tijdstip."
5. Contact section: address, phone, email, Instagram link
6. Footer

In main.js:
- On calendar load: fetch GET /slots?month=YYYY-MM from API
- Read API endpoint from window.API_ENDPOINT (set in a <script> tag in index.html)
- Handle loading states and errors gracefully

In index.html add this script tag (Claude Code fills in the real value from terraform output):
<script>window.API_ENDPOINT = "REPLACE_WITH_API_ENDPOINT";</script>

---

### Task 6 — Get API endpoint and update frontend

Run: terraform output api_endpoint
Set the real value as window.API_ENDPOINT in frontend/public/index.html

---

### Task 7 — Deploy Lambda and frontend to AWS

Package and deploy the Lambda:
```bash
cd lambda/booking
npm install
zip -r ../../lambda-booking.zip .
aws lambda update-function-code \
  --function-name q-atelier-booking \
  --zip-file fileb://../../lambda-booking.zip \
  --region eu-west-1
```

Sync frontend to S3:
```bash
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html"
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --include "*.html"
```

---

### Task 8 — Commit everything
```bash
git add .
git commit -m "feat: complete Phase 2 — Lambda implementation and frontend booking calendar"
git push origin main
```

---

## Conventions

- All user-facing text in Dutch
- IAM least-privilege, no hardcoded secrets
- .ics format for calendar invites (not CSV)
- Appointment duration: 60 minutes
- Available slots: Mon-Sat 10:00 11:00 13:00 14:00 15:00 16:00
- Sunday: closed

## Business details (use these in the frontend)

Name: Q-Atelier
Owner: Sibel Celem
Address: Laan van Vollenhove 159, 3706 CD Zeist, Nederland
Phone: +31 6 85 56 95 51
Email: q.atelier89@gmail.com
Instagram: https://instagram.com/q_atelier_
WhatsApp: https://api.whatsapp.com/send?phone=31685569551
Opening hours: maandag t/m zaterdag 08:00 – 19:00, zondag gesloten
KVK: unknown — leave blank for now