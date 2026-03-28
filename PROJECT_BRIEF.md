# Q-Atelier — Project Brief

**Owner:** Selim Celem  
**Client:** Sibel Celem — q-atelier.nl  
**Stack:** AWS · Terraform · Claude Code  
**Goal:** Replace a €15/month website builder with a production-grade, nearly-free AWS static site + booking system  

---

## Background

Sibel runs a bridal dress tailoring atelier in Zeist, Netherlands. Her current site (JWWB builder) costs €15/month and routes every CTA to a WhatsApp link. There is no booking flow, no Google presence, and no customer confirmation system. The site is invisible in search results.

This project replaces it with a fast, professional static site with a self-service booking calendar, automated email confirmations, and proper SEO foundations — all for ~€0/month operational cost.

This is also a portfolio project for Selim (career switcher: BIM Engineering → Cloud Engineering), targeting the AWS SAA-C03 exam. The infrastructure is built with Terraform and managed as IaC from day one.

---

## Goals

| Priority | Goal |
|----------|------|
| P0 | Static site live on q-atelier.nl via S3 + CloudFront + ACM |
| P0 | Cancel the €15/month JWWB subscription |
| P1 | Booking calendar with available/unavailable slots |
| P1 | SES email confirmation to customer + Sibel on booking |
| P1 | `.ics` calendar attachment (works on iPhone + Android + Gmail) |
| P2 | SNS SMS ping to Sibel's phone on new booking |
| P2 | Google Business Profile setup + structured data (JSON-LD) |
| P2 | Google Search Console + sitemap submission |
| P3 | Admin panel for Sibel to block/open dates |
| P3 | Portfolio gallery with her own photos |

---

## Architecture

```
User
 │
 ▼
CloudFront (CDN + HTTPS)
 │                    │
 ▼                    ▼
S3 (static site)   API Gateway
                      │
                      ▼
                   Lambda
                   ├── POST /booking  → writes to DynamoDB → triggers SES
                   └── GET  /slots    → reads from DynamoDB → returns availability
                      │
              ┌───────┴────────┐
              ▼                ▼
          DynamoDB           SES
      (booked slots)   (sends .ics to customer + Sibel)
                             │
                             ▼
                           SNS
                    (SMS to Sibel's phone)
```

**Domain:** q-atelier.nl is kept on existing registrar (TransIP/Mijndomein/etc). DNS A/CNAME records are pointed at CloudFront. Route 53 is NOT used — it adds €0.50/month with no SEO benefit.

**Email:** Sibel keeps q.atelier89@gmail.com. SES is configured to send FROM a verified identity. Optionally later: info@q-atelier.nl via SES.

---

## Cost Estimate

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| S3 | 5GB storage, 20K GET requests | €0 |
| CloudFront | 1TB transfer, 10M requests | €0 |
| ACM | Free SSL | €0 |
| API Gateway | 1M calls/month | €0 |
| Lambda | 1M invocations/month | €0 |
| DynamoDB | 25GB, 25 WCU/RCU | €0 |
| SES | 62K emails/month | €0 |
| SNS | 1M publishes | €0 |
| **Total** | | **~€0/month** |

Free tier is more than sufficient for a local atelier with ~50-100 bookings/month.

---

## Repo Structure

```
q-atelier/
├── PROJECT_BRIEF.md          ← this file
├── README.md                 ← setup guide for Claude Code / developer
├── .github/
│   └── workflows/
│       └── deploy.yml        ← CI: terraform plan on PR, apply on main merge
├── bootstrap/
│   └── main.tf               ← one-time: creates S3 + DynamoDB for Terraform state
├── modules/
│   ├── hosting/              ← S3 + CloudFront + ACM
│   ├── api/                  ← API Gateway + Lambda
│   ├── database/             ← DynamoDB
│   └── notifications/        ← SES + SNS
├── main.tf                   ← root module, wires everything together
├── variables.tf
├── outputs.tf
├── backend.tf                ← S3 remote state config
├── terraform.tfvars.example  ← template, never commit real values
├── frontend/
│   ├── public/               ← static assets
│   └── src/                  ← HTML/CSS/JS source
└── lambda/
    ├── booking/              ← POST /booking handler
    └── notify/               ← SES + .ics generator
```

---

## Tech Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| IaC | Terraform | Industry standard, job market dominant, multi-cloud |
| State backend | S3 + DynamoDB lock | Standard pattern, cheap, reliable |
| Frontend | Vanilla HTML/CSS/JS | No build tooling overhead for a simple site |
| Calendar invites | `.ics` (iCalendar) | Native support on iPhone, Android, Gmail, Outlook |
| Notifications | SES (email) + SNS (SMS) | SES for rich email with attachment, SNS for instant ping |
| DNS | Existing registrar | Free, Route 53 has no SEO benefit |
| CI/CD | GitHub Actions | Free, integrates with Terraform Cloud or direct AWS |

---

## Language

Site content is Dutch only. All copy is written for a local Dutch audience (Zeist / Utrecht region).

---

## Phases

### Phase 1 — Foundation (do first)
- Bootstrap Terraform state (S3 bucket + DynamoDB lock table)
- Deploy hosting module (S3 + CloudFront + ACM cert)
- Point domain DNS at CloudFront
- Build and deploy barebones static site (home page only)
- Cancel JWWB subscription

### Phase 2 — Booking
- Build booking calendar UI
- Deploy API module (API Gateway + Lambda + DynamoDB)
- Implement GET /slots and POST /booking endpoints
- Wire up SES for customer confirmation with .ics attachment
- Wire up SNS for Sibel SMS notification

### Phase 3 — SEO & Polish
- Add JSON-LD structured data (LocalBusiness schema)
- Add sitemap.xml + robots.txt
- Submit to Google Search Console
- Set up Google Business Profile
- Add portfolio gallery with Sibel's photos
- Proper meta tags on all pages

### Phase 4 — Admin (optional)
- Simple password-protected admin page for Sibel to block dates
- Lambda endpoint for availability management

---

## What Sibel Needs to Provide

- [ ] Login to her domain registrar (to update DNS records)
- [ ] Her best work photos (high resolution)
- [ ] Available days/hours (to configure default slots)
- [ ] Appointment duration (e.g. 60 minutes)
- [ ] Preferred language for customer emails (Dutch)
- [ ] Whether she wants manual or auto-confirm bookings
- [ ] AWS account access (Selim sets this up with her)

---

## Portfolio Notes

This project demonstrates the following AWS SAA-C03 domains in production:

- S3 static hosting + bucket policies + versioning
- CloudFront distribution + Origin Access Control (OAC)
- ACM certificate provisioning + DNS validation
- API Gateway REST API + Lambda proxy integration
- DynamoDB table design (partition key: date, sort key: time slot)
- SES domain identity + DKIM/SPF + sending with attachments
- SNS topic + SMS subscription
- IAM roles with least-privilege policies per Lambda function
- Terraform remote state (S3 + DynamoDB locking)
- GitHub Actions CI/CD pipeline for Terraform

Write up a case study after go-live. Include: architecture diagram, cost breakdown, before/after Google Lighthouse scores.
