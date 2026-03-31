# Portfolio — Q-Atelier

## About This Project

A production website and booking system for a bridal tailoring atelier in Zeist, Netherlands. The project replaced a €15/month website builder (JouwWeb) with a fully serverless AWS solution running at ~€0/month. The site serves real customers with an interactive booking calendar, automated email confirmations with calendar invites, and a manual approval workflow for the business owner.

Live: [q-atelier.nl](https://q-atelier.nl)

---

## My Role

Solo developer — designed, built, and deployed everything:
- Infrastructure architecture and Terraform modules
- Lambda backend (booking API, email system, .ics generation)
- Frontend design and development (responsive, Dutch-language)
- CI/CD pipeline (GitHub Actions)
- DNS cutover and go-live
- Ongoing maintenance and feature additions

---

## Key Engineering Decisions

### Why S3 + CloudFront over a traditional server
A bridal atelier website serves static content to ~100 visitors/month. There's no server-side rendering, no user sessions, no dynamic page generation. S3 + CloudFront gives global CDN distribution, automatic HTTPS, and zero server maintenance — all within free tier. An EC2 instance would cost ~€8/month minimum and require patching.

### Why Lambda over EC2
The booking API handles ~50-100 requests/month. Lambda's pay-per-invocation model means this costs literally €0. An always-on EC2 instance would be wasteful. Lambda also eliminates OS patching, scaling configuration, and availability concerns.

### Why DynamoDB over RDS
The data model is simple: bookings keyed by date + time slot. No joins, no complex queries, no relational integrity needed. DynamoDB's on-demand pricing and GSI support (for token lookups and month queries) fit perfectly. RDS would require a minimum ~€15/month instance.

### Why Resend over SES
AWS SES was the original choice, but AWS rejected the production access request (sandbox limits sending to verified emails only). Rather than fight the support process, I migrated to Resend — simpler API, free tier (3,000 emails/month), no sandbox restrictions, and native support for attachments. The migration took ~2 hours and simplified the email code significantly.

### Why Terraform for IaC
Every AWS resource is defined in Terraform with remote state on S3. This means the entire infrastructure is reproducible, version-controlled, and reviewable in PRs. The CI/CD pipeline runs `terraform plan` on pull requests and `terraform apply` on merge to main.

### Manual confirmation flow design
Rather than auto-confirming bookings, the system puts them in PENDING status. The owner receives an email with three options: accept, reschedule, or reject. Each action triggers the appropriate email to the customer. This gives the business owner full control over their schedule while keeping the customer experience professional with branded HTML emails and .ics calendar invites.

---

## Challenges & Solutions

### SES sandbox rejection → Resend migration
AWS rejected the request for SES production access, blocking all email delivery to unverified addresses. Solution: migrated the entire email system to Resend in a single session. The Resend SDK is simpler than SES raw MIME, and attachments (.ics files) work via a clean `attachments` array instead of manual MIME encoding.

### SVG blend modes requiring inline SVG
A decorative ring divider between sections needed CSS blend modes (`mix-blend-mode`) to overlap with section backgrounds. External SVG files don't support blend modes properly in all browsers. Solution: inline SVG directly in the HTML with explicit z-index layering and CSS isolation.

### CloudFront cache invalidation strategy
Static assets use 1-year cache headers for performance, but HTML files need immediate updates. Solution: two-pass S3 sync — assets get `max-age=31536000`, HTML gets `no-cache`. CloudFront invalidation (`/*`) is triggered after each deploy via CI/CD. Photo folders uploaded directly to S3 are excluded from sync to prevent deletion.

### Token-based secure booking confirmation
Email action links (accept/reject/reschedule) need to be secure but usable from any email client (no login required). Solution: UUID tokens stored in DynamoDB with 7-day TTL, single-use enforcement (status change invalidates the token), and a `token-index` GSI for O(1) lookups.

### DNS cutover with zero downtime
The client's existing JouwWeb site needed to stay live while the new site was tested. Solution: deployed CloudFront with its own `*.cloudfront.net` URL first, had the client test and approve, then switched the DNS ALIAS record at Vimexx to point to CloudFront. ACM certificate was pre-validated, so HTTPS worked immediately after the DNS switch.

### SNS SMS sandbox limitations
AWS SNS sandbox requires individual phone number verification for each SMS recipient. A support case to exit sandbox was never approved. Rather than continue waiting, I removed the SMS feature entirely — email notifications cover the same use case.

---

## What I Learned

This project demonstrates the following AWS concepts in a real production environment:

- **S3 static hosting** with bucket policies, versioning, and Origin Access Control
- **CloudFront CDN** with custom domain, HTTPS via ACM, and cache invalidation strategies
- **ACM certificate provisioning** with DNS validation across regions (us-east-1 for CloudFront)
- **API Gateway REST API** with Lambda proxy integration and CORS configuration
- **DynamoDB table design** — partition key strategy, GSIs, conditional writes for concurrency control
- **Lambda** — Node.js runtime, environment variables, IAM least-privilege, deployment packaging
- **Terraform** — modular infrastructure, remote state, CI/CD integration with GitHub Actions
- **Email delivery** — MIME formatting, .ics calendar attachments, Resend API integration
- **DNS management** — CNAME/ALIAS records, certificate validation, registrar configuration

---

## Live Site

[https://q-atelier.nl](https://q-atelier.nl)
