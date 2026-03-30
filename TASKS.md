# Q-Atelier — Task Tracker

Last updated: 2026-03-30

Legend: [ ] todo · [x] done · [~] in progress · [!] blocked

---

## Privacy
- [x] Remove owner name from all repo files — use role references instead
- [x] Make sure no full name appears in frontend, emails, or Terraform config
- [ ] GitHub repo: check git history for name leaks (git grep)
- [ ] Before making repo public: rewrite git history to remove owner name from old commit messages (git filter-branch or BFG Repo Cleaner)

---

## Branding
- [x] Rename "Q — Atelier" (with dashes/spaces) to "Q-atelier" everywhere in frontend

---

## Frontend — Design
- [x] Redesign color palette: light pink, white, beige — inspired by damore.nl
- [x] Add WhatsApp icon to contact section
- [x] Add Instagram icon to contact section
- [x] Add Google Maps link + icon to address in contact section

---

## Frontend — Pages & Content
- [x] Add "Diensten" subpage with full pricing list + details
- [x] Add "Over ons" subpage with brand story (no full name), client reviews section
- [x] Add pricing to Diensten page:
  - Galajurken vermaak (full list)
  - Bruidsjurken vermaak (full list)
  - Broeken (full list)
  - Jassen & Mantels (full list)
  - Overige kleding (full list)
  - Woningtextiel (full list)

---

## Booking — Calendar
- [x] Fix: past dates and times should be greyed out and unclickable
  - Past dates: entire day greyed out
  - Today: slots before current time greyed out (Amsterdam timezone)
- [x] Update available slots to match availability:
  - Maandag: 12:00 – 18:00
  - Dinsdag: 10:00 – 18:00
  - Woensdag: GESLOTEN
  - Donderdag: 10:00 – 18:00
  - Vrijdag: 10:00 – 18:00
  - Zaterdag: 12:00 – 18:00
  - Zondag: GESLOTEN
- [ ] Update appointment duration logic:
  - Bruidsjurk: 90 minutes (1.5 hour slots)
  - Overige kleding: 60 minutes
  - Consider: service dropdown selection determines slot duration

---

## Booking — Email flow
- [x] Fix: when client accepts rescheduled date, q-atelier89@gmail.com gets wrong email
  - Previously: got a copy of the client confirmation email
  - Now: gets notification "De klant heeft uw voorgestelde datum geaccepteerd" + .ics

---

## Booking — SMS (SNS)
- [~] Fix SNS SMS — 21/21 messages failed in eu-west-1
  - [x] Phone number verified in SNS sandbox
  - [x] SMS quota increase requested
  - [x] Sandbox exit support case submitted
  - [ ] Awaiting AWS approval for sandbox exit

---

## SES — Production Access
- [~] SES production access request
  - [x] Support case replied to with additional info
  - [ ] Awaiting AWS approval

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
