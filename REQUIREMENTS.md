# Requirements — Q-Atelier Website

Last updated: 2026-03-30
Status: In progress

---

## Design requirements

### Overall aesthetic
- Romantic, chique, elegant — NOT vanilla/generic
- Reference: current site at q-atelier.nl (warm, bridal, feminine)
- Fonts: serif display font (think Cormorant Garamond, Playfair Display) + clean body font
- Colors: warm creams, blush pinks, champagne/gold accents, deep dusty rose
- Photography: real photos of the atelier's work (to be supplied — placeholder for now)
- Feel: high-end bridal boutique, not a generic small business website

### Pages / sections
1. Hero — full-width image, elegant headline, CTA
2. About — short intro about the atelier
3. Services — Bruidsjurk vermaken, Dagelijkse kleding repareren, Maatwerk op aanvraag
4. Portfolio — photo gallery of completed work (photos to be supplied by client)
5. Booking — interactive calendar (see booking flow below)
6. Contact — address, social media links, booking info

---

## Booking flow — full specification

### Current (Phase 2 — built)
- Customer picks date + slot on calendar
- Fills in form (name, email, phone, service)
- Auto-confirmed immediately
- Customer gets .ics + confirmation email
- The business owner gets email

### Required (Phase 3 — to build)
Manual confirmation flow — the business owner reviews each booking request before it is confirmed.

---

### Step 1 — Customer requests appointment
Customer fills in booking form on website.

DynamoDB status written as: `PENDING`

The business owner receives email with:
  - Customer details (name, email, phone, date, time slot, service)
  - Three action buttons:

---

### Step 2 — Business owner's action (3 options)

#### Option A — Accept
The business owner clicks "Accepteren" in the email.

Result:
- DynamoDB status → `CONFIRMED`
- Customer receives:
  - Confirmation email in Dutch addressing them by name
  - .ics calendar invite attached
  - Body: "Beste [naam], uw afspraak bij Q-Atelier is bevestigd. Datum: [datum], Tijd: [tijdstip], Service: [service]. Adres: Laan van Vollenhove 159, 3706 CD Zeist. Tot dan! — Q-Atelier"
- The business owner receives:
  - Confirmation that the email was sent to the customer

---

#### Option B — Reject and propose new time
The business owner clicks "Nieuw tijdstip voorstellen" in the email.

The business owner is taken to a simple webpage (hosted on same S3/CloudFront) where they can:
- See a date picker + time slot dropdown (only showing available slots)
- Submit the new suggested date/time

Result:
- DynamoDB status → `RESCHEDULED`
- Customer receives email (Dutch):
  - "Beste [naam], helaas zijn wij op [originele datum] om [originele tijdstip] niet beschikbaar."
  - "Wij stellen voor: [nieuwe datum] om [nieuwe tijdstip]."
  - Two buttons: "Accepteren" / "Afwijzen"

Customer response:
- If customer clicks "Accepteren":
  - DynamoDB status → `CONFIRMED`
  - Customer gets confirmation email + .ics
  - The business owner gets email: "[naam] heeft het nieuwe tijdstip geaccepteerd." + .ics
- If customer clicks "Afwijzen":
  - DynamoDB status → `CANCELLED`
  - The business owner gets email: "[naam] heeft het nieuwe tijdstip afgewezen."
  - Both emails include: customer phone number + email for manual follow-up
  - The business owner's email includes WhatsApp link: https://api.whatsapp.com/send?phone=[phone]

---

#### Option C — Reject and contact manually
The business owner clicks "Afwijzen" in the email.

Result:
- DynamoDB status → `CANCELLED`
- Customer receives email (Dutch):
  - "Beste [naam], helaas kunnen wij uw afspraakverzoek op dit moment niet bevestigen."
  - "Wij nemen zo snel mogelijk contact met u op."
- The business owner receives email with:
  - Customer name, email, phone number
  - WhatsApp link: https://api.whatsapp.com/send?phone=[customerphone]
  - Note: "Neem contact op met de klant om een alternatief te bespreken."

---

### Action link security
All action links (accept/reject/reschedule) in emails must be:
- Signed with a token (UUID stored in DynamoDB per booking)
- Single-use (token invalidated after use)
- Time-limited (expire after 7 days)

This prevents anyone who finds the email from accidentally accepting/rejecting bookings.

---

## DynamoDB schema update

Add fields to booking item:
- `status` (S): PENDING | CONFIRMED | RESCHEDULED | CANCELLED
- `token` (S): UUID for secure action links
- `suggested_date` (S): new date proposed by the business owner (Option B)
- `suggested_time_slot` (S): new time proposed by the business owner (Option B)
- `token_expires_at` (N): Unix timestamp

Add GSI:
- `token-index`: hash key = token (for looking up booking by token in action links)

---

## Infrastructure additions needed

- New Lambda endpoints:
  - GET /action?token=xxx&action=accept|reject (business owner's action from email)
  - GET /reschedule?token=xxx (business owner's reschedule page)
  - POST /reschedule (business owner submits new date/time)
  - GET /respond?token=xxx&action=accept|reject (Customer responds to reschedule)
- New S3 pages:
  - /reschedule.html (business owner's date picker page)
  - /respond.html (Customer's accept/reject page)

---

## Go-live plan

### Current blocker
ACM cert is PENDING_VALIDATION — CloudFront cannot deploy until cert is issued.
DNS validation CNAMEs need to be added but the client wants the existing JouwWeb site to stay live.

### Solution
1. Skip custom domain for now
2. Deploy CloudFront with a self-signed or no custom domain first (test only)
   OR use the raw CloudFront URL (*.cloudfront.net) for the client to test
3. The client tests and approves the new site on the CloudFront test URL
4. When approved: switch nameservers at Vimexx, cert validates, go live

### Temporary test URL approach
- Remove custom domain aliases from CloudFront distribution temporarily
- CloudFront deploys successfully on its own *.cloudfront.net URL
- The client can test on that URL
- When ready: re-add domain aliases, validate cert, switch DNS

---

## Language
All customer-facing content: Dutch (nl)
All owner-facing content (emails, admin): Dutch (nl)
