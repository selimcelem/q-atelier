# Q-Atelier — Infrastructure & Website

Static site + booking system for q-atelier.nl, built on AWS with Terraform.

## What's deployed

| Component | Service | Status |
|-----------|---------|--------|
| Frontend | S3 static site | Deployed |
| API | API Gateway (REST, `prod` stage) | Deployed |
| Lambda | `q-atelier-booking` (Node.js 20) | Deployed |
| Database | DynamoDB `q-atelier-bookings` | Deployed |
| Email | Resend (from info@q-atelier.nl) | Deployed |
| SMS | SNS booking alerts | Deployed (sandbox exit pending AWS approval) |
| CDN | CloudFront + ACM SSL | Deployed (test: dyshhxdimbjli.cloudfront.net — DNS cutover pending) |

## Architecture

```
Browser → CloudFront → S3 static site
Browser → API Gateway → Lambda → DynamoDB
                              → Resend (email + .ics)
                              → SNS (SMS)
```

## API Endpoints

**GET** `/slots?month=YYYY-MM` — Returns availability map for the month.
Each date maps slot times to `"available"` or `"booked"`. Closed days (Wed, Sun) excluded.

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
De eigenaar receives HTML email with accept/reschedule/reject buttons + SMS.

**GET** `/action?token=TOKEN&action=accept|reject` — De eigenaar accepts or rejects a booking from email.

**GET** `/reschedule?token=TOKEN` — Shows de eigenaar a date/time picker to propose a new slot.

**POST** `/reschedule` — Submits de eigenaar's proposed new date/time. Customer receives email with accept/reject buttons.

**GET** `/respond?token=TOKEN&action=accept|reject` — Customer accepts or rejects the rescheduled time.

## Frontend

Vanilla HTML/CSS/JS site with:
- Hero section with background video and CTA
- Four service categories (bruidsjurken vermaak, galajurken vermaak, dagelijkse kleding, gordijnen)
- Interactive booking calendar with month navigation
- Time slot picker and booking form
- Contact section with address, phone, Instagram, WhatsApp + opening hours
- Subpages: `diensten.html` (full pricing list) and `over-ons.html` (about page with photos)
- Responsive design, all text in Dutch

## Prerequisites

- **AWS CLI** configured (`aws configure`) with IAM credentials
- **Terraform** >= 1.7
- **Node.js** >= 18 (for Lambda packaging)
- **PowerShell** (Windows) or `zip` (Linux/Mac) for Lambda packaging

## AWS Resources Required

These resources must exist (created by Terraform):
- S3 bucket: `q-atelier-site`
- CloudFront distribution: `E2LJC4OK76HPZO`
- ACM certificate (us-east-1, attached to CloudFront)
- DynamoDB table: `q-atelier-bookings` (with `month-index` and `token-index` GSIs)
- API Gateway: `q-atelier-api` (stage: `prod`)
- Lambda function: `q-atelier-booking`
- SNS topic: `q-atelier-booking-alerts`

## Lambda Environment Variables

| Variable | Description |
|----------|-------------|
| `BOOKINGS_TABLE` | DynamoDB table name (`q-atelier-bookings`) |
| `SNS_TOPIC_ARN` | SNS topic ARN for SMS alerts |
| `SIBEL_EMAIL` | Owner's email for notifications |
| `FROM_EMAIL` | Sender email (legacy, not used by Resend) |
| `RESEND_API_KEY` | Resend API key for sending emails |

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
cd ../..

# Windows:
powershell -Command "Compress-Archive -Path 'lambda/booking/*' -DestinationPath 'lambda-booking.zip' -Force"
# Linux/Mac:
# cd lambda/booking && zip -r ../../lambda-booking.zip . && cd ../..

aws lambda update-function-code \
  --function-name q-atelier-booking \
  --zip-file fileb://lambda-booking.zip \
  --region eu-west-1
```

### 5. Set Lambda environment variables

```bash
aws lambda update-function-configuration \
  --function-name q-atelier-booking \
  --environment "Variables={BOOKINGS_TABLE=q-atelier-bookings,SNS_TOPIC_ARN=arn:aws:sns:eu-west-1:ACCOUNT_ID:q-atelier-booking-alerts,SIBEL_EMAIL=owner@email.com,FROM_EMAIL=from@email.com,RESEND_API_KEY=re_xxx}" \
  --region eu-west-1
```

### 6. Deploy frontend

```bash
# Non-HTML assets (CSS, JS, images) with long cache
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html" --exclude "video/*" \
  --exclude "About us/*" --exclude "Review pictures/*"

# HTML files with no-cache
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --exclude "*" --include "*.html"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E2LJC4OK76HPZO \
  --paths "/*"
```

**Important:** The `About us/` and `Review pictures/` folders exist only in S3 (uploaded manually). Always exclude them from sync to prevent deletion.

## Cost

Expected: ~€0/month. All services within AWS free tier. Resend free tier covers 3,000 emails/month.
