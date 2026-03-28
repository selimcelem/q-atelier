# Q-Atelier — Infrastructure & Website

Static site + booking system for q-atelier.nl, built on AWS with Terraform.

## Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.7 installed
- Node.js >= 18 (for Lambda packaging)
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)

## First-Time Setup

### 1. Bootstrap Terraform state

This is a one-time manual step. It creates the S3 bucket and DynamoDB table that Terraform uses to store state.

```bash
cd bootstrap
terraform init
terraform apply
```

Note the output values — copy them into `backend.tf`.

### 2. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values — never commit this file
```

### 3. Deploy infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 4. Deploy frontend

```bash
# Upload static site to S3 (CloudFront distribution URL in terraform output)
aws s3 sync frontend/public/ s3://$(terraform output -raw site_bucket_name) --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Development with Claude Code

```bash
# Open Claude Code in project root
claude

# Useful prompts to get started:
# "Implement the GET /slots Lambda handler in lambda/booking/"
# "Build the booking calendar UI component in frontend/src/components/"
# "Write the .ics generator in lambda/notify/"
# "Add DynamoDB GSI for querying slots by month"
```

## Destroy Everything

```bash
terraform destroy
# Then manually empty and delete the bootstrap S3 bucket
```

## Cost

Expected: ~€0/month (all services within AWS free tier for expected traffic volume).
