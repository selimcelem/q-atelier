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
| SMS | SNS booking alerts | Deployed |
| CDN | CloudFront | Blocked (ACM DNS validation pending) |

## Architecture

```
Browser → (CloudFront) → S3 static site
Browser → API Gateway → Lambda → DynamoDB
                              → SES (email + .ics)
                              → SNS (SMS)
```

## API Endpoints

**GET** `/slots?month=YYYY-MM` — Returns availability map for the month.
Each date maps slot times to `"available"` or `"booked"`. Sundays excluded.

**POST** `/booking` — Creates a booking.
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

## Frontend

Single-page vanilla HTML/CSS/JS site with:
- Hero section with CTA
- Three service cards (bruidsjurk vermaken, reparaties, maatwerk)
- Interactive booking calendar with month navigation
- Time slot picker and booking form
- Contact section with address, phone, Instagram, WhatsApp
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

Expected: ~€0/month (all services within AWS free tier for expected traffic).
