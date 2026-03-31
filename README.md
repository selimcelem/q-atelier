# Q-Atelier — Production AWS Website & Booking System

A fully serverless website and booking system for a bridal tailoring atelier in Zeist, Netherlands. Built entirely with AWS services and Terraform, replacing a €15/month website builder with a production-grade solution running at ~€0/month.

Live site: [q-atelier.nl](https://q-atelier.nl)

---

## Architecture

```
Browser → CloudFront (CDN + HTTPS) → S3 (static site)
Browser → API Gateway (REST) → Lambda (Node.js 20) → DynamoDB
                                                    → Resend (email + .ics)
```

| Layer | Service |
|-------|---------|
| Frontend | Static HTML/CSS/JS on S3 + CloudFront CDN |
| API | AWS API Gateway (REST, `prod` stage) |
| Compute | AWS Lambda (Node.js 20) |
| Database | Amazon DynamoDB (on-demand capacity) |
| Email | Resend API (HTML emails + .ics calendar attachments) |
| SSL/TLS | AWS Certificate Manager (ACM) |
| IaC | Terraform (remote state on S3 + DynamoDB lock) |
| CI/CD | GitHub Actions (plan on PR, apply on merge) |
| Domain | q-atelier.nl — DNS on existing registrar, ALIAS to CloudFront |

---

## Features

- **Responsive multi-page website** — Hero with background video, services overview, pricing tables, about page, contact section
- **Real-time booking calendar** — Interactive month-view calendar with day-specific time slot availability
- **Manual confirmation flow** — PENDING → ACCEPT / RESCHEDULE / REJECT workflow via email action links
- **Token-based secure links** — UUID tokens with 7-day expiry for email action buttons (single-use)
- **HTML emails with .ics attachments** — Calendar invites compatible with iPhone, Android, Gmail, Outlook
- **CloudFront CDN** — Custom domain with HTTPS via ACM certificate
- **Past-time filtering** — Slots greyed out based on current Amsterdam timezone
- **Double-booking prevention** — DynamoDB conditional writes prevent slot conflicts (409 on conflict)

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Infrastructure as Code | Terraform |
| Cloud Provider | AWS (eu-west-1) |
| Static Hosting | S3 + CloudFront |
| Compute | Lambda (Node.js 20) |
| API | API Gateway (REST) |
| Database | DynamoDB |
| Email | Resend |
| SSL | ACM (us-east-1, required by CloudFront) |
| CI/CD | GitHub Actions |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Calendar Invites | iCalendar (.ics) format |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/slots?month=YYYY-MM` | Returns monthly availability map |
| POST | `/booking` | Creates a booking request (status: PENDING) |
| GET | `/action?token=TOKEN&action=accept\|reject` | Owner accepts or rejects booking |
| GET | `/reschedule?token=TOKEN` | Shows date/time picker for rescheduling |
| POST | `/reschedule` | Submits proposed new date/time |
| GET | `/respond?token=TOKEN&action=accept\|reject` | Customer responds to reschedule proposal |

---

## Setup & Deployment

### Prerequisites

- AWS CLI configured with IAM credentials
- Terraform >= 1.7
- Node.js >= 18

### 1. Bootstrap Terraform State (one-time)

```bash
cd bootstrap
terraform init && terraform apply
```

### 2. Deploy Infrastructure

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values — never commit this file

terraform init
terraform plan
terraform apply
```

### 3. Deploy Lambda

```bash
cd lambda/booking && npm install && cd ../..

# Windows:
powershell -Command "Compress-Archive -Path 'lambda/booking/*' -DestinationPath 'lambda-booking.zip' -Force"
# Linux/Mac:
# cd lambda/booking && zip -r ../../lambda-booking.zip . && cd ../..

aws lambda update-function-code \
  --function-name q-atelier-booking \
  --zip-file fileb://lambda-booking.zip \
  --region eu-west-1
```

### 4. Deploy Frontend

```bash
# Static assets with long cache
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html" --exclude "video/*" \
  --exclude "About us/*" --exclude "Review pictures/*" --exclude "Diensten/*"

# HTML files with no-cache
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --include "*.html" --exclude "video/*" \
  --exclude "About us/*" --exclude "Review pictures/*" --exclude "Diensten/*"

# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### Required Environment Variables (Lambda)

| Variable | Description |
|----------|-------------|
| `BOOKINGS_TABLE` | DynamoDB table name |
| `SIBEL_EMAIL` | Owner notification email address |
| `RESEND_API_KEY` | Resend API key for sending emails |

---

## AWS Resources

All resources are provisioned via Terraform:

- **S3** — Static site hosting bucket
- **CloudFront** — CDN distribution with Origin Access Control
- **ACM** — SSL/TLS certificate (us-east-1)
- **API Gateway** — REST API with Lambda proxy integration
- **Lambda** — Booking handler (Node.js 20)
- **DynamoDB** — Bookings table with GSIs (`month-index`, `token-index`)
- **IAM** — Least-privilege Lambda execution role

---

## Project Structure

```
q-atelier/
├── .github/workflows/    CI/CD pipeline (Terraform + frontend deploy)
├── bootstrap/            One-time Terraform state backend setup
├── modules/
│   ├── hosting/          S3 + CloudFront + ACM
│   ├── api/              API Gateway + Lambda
│   ├── database/         DynamoDB
│   └── notifications/    Email identity config (legacy SES)
├── lambda/booking/       Lambda handler, email, .ics generator
├── frontend/public/      Static HTML/CSS/JS site
├── main.tf               Root Terraform module
├── variables.tf          Input variables
├── outputs.tf            Terraform outputs
└── backend.tf            S3 remote state configuration
```

---

## Cost

All services run within AWS Free Tier. Resend free tier covers 3,000 emails/month.
Expected monthly cost: **~€0**.

---

## Developer

**Selim Celem** — Career switcher from BIM Engineering to Cloud Engineering, pursuing AWS Solutions Architect Associate (SAA-C03).

- GitHub: [github.com/selimcelem](https://github.com/selimcelem)
- LinkedIn: [linkedin.com/in/selimcelem](https://linkedin.com/in/selimcelem)
