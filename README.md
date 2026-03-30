# Q-Atelier — Infrastructure & Website

Static site + booking system for q-atelier.nl, built on AWS with Terraform.

## What's deployed

| Component | Service | Status |
|-----------|---------|--------|
| Frontend | S3 static site | Deployed |
| API | API Gateway (REST, `prod` stage) | Deployed |
| Lambda | `q-atelier-booking` (Node.js 20) | Deployed |
| Database | DynamoDB `q-atelier-bookings` | Deployed |
| Email | SES with .ics calendar attachment | Deployed |
| SMS | SNS booking alerts | Deployed (sandbox exit pending AWS approval) |
| CDN | CloudFront + ACM SSL | Deployed (test: dyshhxdimbjli.cloudfront.net — DNS cutover pending) |

## Architecture

```
Browser → CloudFront → S3 static site
Browser → API Gateway → Lambda → DynamoDB
                              → SES (email + .ics)
                              → SNS (SMS)
```

## API Endpoints

**GET** `/slots?month=YYYY-MM` — Returns availability map for the month.
Each date maps slot times to `"available"` or `"booked"`. Sundays excluded.

**POST** `/booking` — Creates a booking request (status: PENDING).
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "date": "YYYY-MM-DD",
  "time_slot": "HH:MM",
  "service": "string"
}
```
Returns 200 on success, 409 if slot taken, 400 on validation error.
De eigenaar ontvangt HTML email with accept/reschedule/reject buttons + SMS.

**GET** `/action?token=TOKEN&action=accept|reject` — De eigenaar accepts or rejects a booking from email.

**GET** `/reschedule?token=TOKEN` — Shows de eigenaar a date/time picker to propose a new slot.

**POST** `/reschedule` — Submits de eigenaar's proposed new date/time. Customer receives email with accept/reject buttons.

**GET** `/respond?token=TOKEN&action=accept|reject` — Customer accepts or rejects the rescheduled time.

## Frontend

Vanilla HTML/CSS/JS site with:
- Hero section with CTA
- Four service categories (bruidsjurken vermaak, galajurken vermaak, dagelijkse kleding, gordijnen)
- Interactive booking calendar with month navigation
- Time slot picker and booking form
- Contact section with address, phone, Instagram, WhatsApp + opening hours
- Subpages: `diensten.html` (full pricing list) and `over-ons.html` (about page)
- Responsive design, all text in Dutch

## Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.7 installed
- Node.js >= 18 (for Lambda packaging)

## Setup

### 1. Bootstrap Terraform state (one-time)

```bash
cd bootstrap
terraform init && terraform apply
```

### 2. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — never commit this file
```

### 3. Deploy infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 4. Deploy Lambda

```bash
cd lambda/booking
npm install
# Windows:
powershell -Command "Compress-Archive -Path './*' -DestinationPath '../../lambda-booking.zip' -Force"
# Linux/Mac:
# zip -r ../../lambda-booking.zip .

aws lambda update-function-code \
  --function-name q-atelier-booking \
  --zip-file fileb://../../lambda-booking.zip \
  --region eu-west-1
```

### 5. Deploy frontend

```bash
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html"
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --include "*.html"
```

## Cost

Expected: ~€1/month (SNS origination number) + €0 for all other services within AWS free tier.
