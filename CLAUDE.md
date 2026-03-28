# CLAUDE.md — Q-Atelier Project Context

This file is read automatically by Claude Code. It tells you everything about this project.

## What this is

A production AWS static site + booking system for Q-Atelier (q-atelier.nl), a bridal dress tailoring atelier in Zeist, Netherlands. Built with Terraform + vanilla JS. Also a portfolio project for the developer (AWS SAA-C03 candidate, career switching from BIM to Cloud Engineering).

## Stack

- **IaC:** Terraform (remote state on S3, lock on DynamoDB)
- **Hosting:** S3 + CloudFront + ACM
- **API:** API Gateway + Lambda (Node.js 20)
- **Database:** DynamoDB
- **Email:** SES with .ics attachment
- **SMS:** SNS
- **Frontend:** Vanilla HTML/CSS/JS (no build tooling)
- **Language:** Dutch (nl)

## Key files

- `PROJECT_BRIEF.md` — full scope, architecture, phases
- `modules/hosting/` — S3 + CloudFront + ACM
- `modules/api/` — API Gateway + Lambda
- `modules/database/` — DynamoDB table design
- `modules/notifications/` — SES + SNS
- `lambda/booking/index.js` — Lambda handler (GET /slots, POST /booking)
- `frontend/public/` — static site files

## Current status

Phase 1 infrastructure is scaffolded. Lambda handlers are stubs with TODOs.

## What needs doing next

1. Fill in `backend.tf` with values from `bootstrap/` output
2. Run `bootstrap/`, then `terraform init && terraform apply`
3. Implement `lambda/booking/index.js` — GET /slots and POST /booking
4. Build booking calendar UI in `frontend/public/`
5. Wire .ics generation into POST /booking

## Conventions

- All Terraform resources tagged with `Project = "q-atelier"`
- IAM: least-privilege per function, no wildcards on sensitive actions
- Lambda env vars for all config (no hardcoded values)
- Dutch language in all user-facing content
- `.ics` format for calendar invites (not CSV — works on iPhone + Android + Gmail)

## Sensitive values

Never hardcode. Use `terraform.tfvars` (gitignored) or GitHub Actions secrets.
Variables: `sibel_email`, `sibel_phone`, `ses_from_email`, `domain_name`
