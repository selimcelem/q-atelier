# Q-Atelier — Task Tracker

Last updated: 2026-03-31

Legend: [ ] todo · [x] done · [~] in progress · [!] blocked

---

## Privacy
- [x] Remove owner name from all repo files — use role references instead
- [x] Make sure no full name appears in frontend, emails, or Terraform config
- [x] Replace "Sibel" with "de eigenaar" in all .md files and Terraform comments
- [ ] GitHub repo: check git history for name leaks (git grep)
- [ ] Before making repo public: rewrite git history to remove owner name from old commit messages (git filter-branch or BFG Repo Cleaner)

---

## Branding
- [x] Rename "Q — Atelier" (with dashes/spaces) to "Q-Atelier" everywhere in frontend

---

## Frontend — Design
- [x] Redesign color palette: light pink, white, beige — inspired by damore.nl
- [x] Add WhatsApp icon to contact section
- [x] Add Instagram icon to contact section
- [x] Add Google Maps link + icon to address in contact section
- [x] SVG ring divider between hero and intro sections
- [x] Hero background video

---

## Frontend — Pages & Content
- [x] Add "Diensten" subpage with full pricing list + details
- [x] Add "Over ons" subpage with brand story (no full name), client reviews section
- [x] Add review photos and about us photos to over-ons.html
- [x] Add photo lightbox (native dialog element) for clickable image expansion
- [x] Add pricing to Diensten page (all categories)

---

## Booking — Calendar
- [x] Fix: past dates and times should be greyed out and unclickable
- [x] Update available slots to match day-specific availability
- [ ] Update appointment duration logic:
  - Bruidsjurk: 90 minutes (1.5 hour slots)
  - Overige kleding: 60 minutes
  - Consider: service dropdown selection determines slot duration

---

## Booking — Email flow
- [x] Fix: when client accepts rescheduled date, owner gets correct notification email
- [x] Migrate email sending from AWS SES to Resend
- [ ] Resend domain verification (q-atelier.nl DNS records in Resend dashboard)

---

## Booking — SMS (SNS)
- [~] Fix SNS SMS — 21/21 messages failed in eu-west-1
  - [x] Phone number verified in SNS sandbox
  - [x] SMS quota increase requested
  - [x] Sandbox exit support case submitted
  - [ ] Awaiting AWS approval for sandbox exit
- [ ] Decision: keep SNS SMS or replace with Twilio

---

## SES — Production Access
- [~] SES production access request (legacy — may no longer be needed since migrated to Resend)
  - [x] Support case replied to with additional info
  - [ ] Awaiting AWS approval

---

## SEO & Discovery
- [ ] JSON-LD LocalBusiness structured data
- [ ] Sitemap.xml + robots.txt
- [ ] Proper meta tags (og:image, description) on all pages
- [ ] Schema markup for services + pricing
- [ ] Google Business Profile setup
- [ ] Google Search Console submission

---

## DNS & Go-live
- [ ] DNS cutover from JouwWeb to CloudFront (pending de eigenaar approval)
- [ ] Git history cleanup before repo goes public

---

## Infrastructure
- [~] SNS SMS: sandbox exit pending (see above)

---

## Pricing reference (for Diensten page)

### Galajurken – Vermaak
| Dienst | Prijs |
|--------|-------|
| Jurk inkorten (1 laag) | €35 |
| Jurk inkorten (2 lagen) | €45 |
| Jurk inkorten (3+ lagen) | €55 – €65 |
| Jurk innemen | €35 – €50 |
| Bandjes inkorten | €20 |
| Rits vervangen | €35 |
| Split maken | €35 – €45 |
| Mouwen inkorten | €25 – €35 |
| Jurk strijken | €20 |

### Bruidsjurken – Vermaak
| Dienst | Prijs |
|--------|-------|
| Bruidsjurk inkorten (1–2 lagen) | vanaf €75 |
| Bruidsjurk inkorten (3–5 lagen) | vanaf €95 – €120 |
| Kant inkorten (met applicaties) | vanaf €120 – €160 |
| Sleep inkorten | vanaf €45 – €70 |
| Jurk innemen (zijkanten) | vanaf €60 – €85 |
| Taille innemen | vanaf €50 – €75 |
| Rug uitdiepen | vanaf €60 |
| Vetersluiting maken | vanaf €90 – €120 |
| Bandjes inkorten | vanaf €25 |
| Mouwen toevoegen | vanaf €75 – €120 |
| Nieuwe rits | vanaf €45 |
| Bruidsjurk stomen / strijken | vanaf €30 |

### Broeken
| Dienst | Prijs |
|--------|-------|
| Inkorten (standaard zoom) | €15 |
| Inkorten (originele jeanszoom) | vanaf €18 |
| Innemen (zijnaden) | vanaf €14 |
| Wijder maken | vanaf €20 |
| Scheur herstellen (groot/zichtbaar) | vanaf €18 |
| Scheur herstellen (klein) | vanaf €10 |
| Slijtplek verstevigen | vanaf €12 |
| Knoop / jeansknoop plaatsen | vanaf €7 |
| Rits vervangen | vanaf €15 |

### Jassen & Mantels
| Dienst | Prijs |
|--------|-------|
| Nieuwe rits (korte jas) | vanaf €35 |
| Nieuwe rits (winterjas/lang model) | vanaf €45 |
| Mouw inkorten | vanaf €22 |
| Jas innemen | vanaf €30 |
| Drukknoppen vervangen | vanaf €8 |

### Overige kleding
| Dienst | Prijs |
|--------|-------|
| Blouse/shirt inkorten | vanaf €15 |
| Mouwen inkorten | vanaf €15 |
| Knoop aanzetten | vanaf €2,50 |
| Meerdere knopen (tot 5 stuks) | vanaf €8 |

### Woningtextiel
| Dienst | Prijs |
|--------|-------|
| Gordijnen inkorten | vanaf €9 per meter |
| Gordijnen inkorten met voering | vanaf €12 per meter |

---

## Availability reference (for Lambda config)
Maandag: 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
Dinsdag: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
Woensdag: GESLOTEN
Donderdag: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
Vrijdag: 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, 17:00
Zaterdag: 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
Zondag: GESLOTEN
