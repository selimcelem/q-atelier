# Requirements — Q-Atelier Website

Last updated: 2026-03-31
Status: Live in production

---

## Design

### Aesthetic
- Romantic, elegant, high-end bridal boutique feel
- Typography: Cormorant Garamond (serif headlines) + Jost (sans-serif body)
- Palette: warm blush (#FDFAF7 background, #D4A5A5 / #C68B8B accents, #3D2B2B text)
- Hero section with fullscreen background video and semi-transparent overlay

### Pages
1. **Home** (`index.html`) — Hero with video, intro strip, services overview, booking calendar, contact section with opening hours
2. **Services** (`diensten.html`) — Full pricing tables for all service categories (bridal gowns, evening gowns, trousers, jackets, general clothing, home textiles)
3. **About** (`over-ons.html`) — Brand story, process overview, client review photos, atelier photos with lightbox

### Frontend
- Vanilla HTML/CSS/JS — no build tooling
- Responsive design (mobile hamburger menu, single-column stacking)
- Scroll animations via Intersection Observer
- SVG inline icons for WhatsApp, Instagram, Google Maps in contact section
- All customer-facing text in Dutch

---

## Booking flow

### Step 1 — Customer requests appointment
- Customer selects a date on the interactive calendar (month navigation, past dates greyed out)
- Selects an available time slot (past slots on today greyed out using `Europe/Amsterdam` timezone)
- Fills in: name, email, phone, service type
- Booking saved to DynamoDB with status `PENDING`
- Cancelled slots are automatically freed up and become rebookable

### Step 2 — Business owner receives notification
The business owner receives an HTML email via Resend with:
- Customer details (name, email, phone, date, time slot, service)
- Three action buttons: **Accept** (green) / **Reschedule** (blue) / **Reject** (red)
- All links are token-secured (see Security section below)

### Step 3 — Business owner responds

#### Accept
- DynamoDB status → `CONFIRMED`
- Customer receives confirmation email in Dutch with .ics calendar attachment
- The business owner receives a confirmation notification with .ics attachment

#### Reschedule
- The business owner is taken to a date/time picker page to propose a new slot
- DynamoDB status → `RESCHEDULED`
- Customer receives email with the proposed new date and two buttons: Accept / Reject
- If customer accepts: status → `CONFIRMED`, customer gets .ics, business owner gets notification + .ics
- If customer rejects: status → `CANCELLED`, business owner gets notification with customer contact details and WhatsApp link for manual follow-up

#### Reject
- DynamoDB status → `CANCELLED`
- Customer receives rejection email
- The business owner receives customer contact details and WhatsApp link for manual follow-up

---

## Email system

- **Provider:** Resend (migrated from SES after AWS rejected production access request)
- **Sender:** `Q-Atelier <info@q-atelier.nl>` (requires Resend domain verification)
- **Format:** HTML emails, Dutch language
- **Attachments:** .ics calendar invites (iCalendar format — works on iPhone, Android, Gmail, Outlook)
- **Date format:** dd/mm/yyyy in all emails

---

## Token-based action link security

All action links (accept/reject/reschedule) in emails use:
- UUID token generated per booking, stored in DynamoDB
- Single-use — status change invalidates the token
- 7-day expiry via `token_expires_at` TTL
- `token-index` GSI for O(1) token lookups

This prevents unauthorized use of action links found in forwarded emails.

---

## Availability

Day-specific time slots:
- Monday: 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Tuesday: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Wednesday: Closed
- Thursday: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Friday: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Saturday: 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
- Sunday: Closed

Appointment duration: 60 minutes.

---

## DynamoDB schema

### Booking item fields
- `date` (S): Partition key (YYYY-MM-DD)
- `time_slot` (S): Sort key (HH:MM)
- `name`, `email`, `phone`, `service` (S): Customer details
- `status` (S): PENDING | CONFIRMED | RESCHEDULED | CANCELLED
- `token` (S): UUID for secure action links
- `token_expires_at` (N): Unix timestamp
- `suggested_date` (S): New date proposed on reschedule
- `suggested_time_slot` (S): New time proposed on reschedule
- `customer_token` (S): Separate token for customer's response to reschedule

### GSIs
- `month-index`: For querying all bookings in a given month (GET /slots)
- `token-index`: Hash key = token, for action link lookups

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/slots?month=YYYY-MM` | Returns monthly availability map (available/booked per slot) |
| POST | `/booking` | Creates booking (PENDING), sends notification to business owner |
| GET | `/action?token=TOKEN&action=accept\|reject` | Business owner accepts or rejects |
| GET | `/reschedule?token=TOKEN` | Shows reschedule date/time picker |
| POST | `/reschedule` | Submits proposed new date/time, emails customer |
| GET | `/respond?token=TOKEN&action=accept\|reject` | Customer responds to reschedule proposal |

All endpoints served via API Gateway → Lambda proxy integration. CORS enabled.

---

## Infrastructure

| Component | Service | Status |
|-----------|---------|--------|
| Static hosting | S3 bucket | Live |
| CDN + HTTPS | CloudFront + ACM | Live |
| API | API Gateway (REST, `prod` stage) | Live |
| Compute | Lambda (Node.js 20) | Live |
| Database | DynamoDB (on-demand) | Live |
| Email | Resend | Live |
| IaC | Terraform (remote state on S3) | Live |
| CI/CD | GitHub Actions | Live |
| Domain | q-atelier.nl via existing registrar (Vimexx) | Live |

---

## Language
- All customer-facing content: Dutch
- All business owner-facing emails: Dutch
- All documentation and code: English
