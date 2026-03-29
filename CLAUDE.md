## TONIGHT'S MISSION

Work through these tasks completely and autonomously. Make reasonable decisions without
stopping to ask questions. Never add Co-authored-by or any Claude/Anthropic attribution
to commits. Commit after each completed task with a descriptive message.

---

### Task 1 — Redesign the frontend

Sibel's feedback: the current design is too vanilla. She wants romantic, chique, elegant.
Think high-end Parisian bridal boutique. Not generic small business.

Redesign frontend/public/index.html, frontend/public/style.css, frontend/public/main.js completely.

Design direction:
- Typography: Cormorant Garamond (serif, italic for headlines) + Jost or similar clean sans for body
  Load from Google Fonts
- Colors: deep ivory/cream background (#FAF8F5), dusty rose accents (#C9A99A),
  champagne gold details (#B8973E), deep charcoal text (#2C2623)
- Layout: full-width hero with elegant overlay text, generous whitespace, refined details
- Buttons: thin bordered, minimal, elegant hover effects
- Calendar: keep functionality exactly the same, just restyle to match
- NO gradients, NO drop shadows everywhere, NO generic stock photo layouts
- Think: Vera Wang website, not Vistaprint

Sections (keep all existing content and functionality):
1. Header — minimal, logo left "Q — Atelier", nav right (Home, Diensten, Afspraak)
   Thin top border in dusty rose
2. Hero — full viewport height, elegant headline in Cormorant Garamond italic,
   "De perfecte pasvorm voor jouw droomjurk."
   Subline: "Thuisatelier in Zeist — maatwerk met zorg en precisie"
   CTA button: "Plan een afspraak" — thin border style
   Background: warm cream with a subtle linen texture feel (CSS only, no images)
3. Services — three elegant cards, minimal borders, serif headings
   - Bruidsjurk vermaken & aanpassen
   - Dagelijkse kleding repareren
   - Maatwerk op aanvraag
4. Booking section — same functionality, elegant restyled calendar
   Month/year in Cormorant Garamond, available dates subtle cream cards,
   booked dates very faded, selected date in dusty rose
5. Contact — clean, minimal, address + phone + email + Instagram + WhatsApp
6. Footer — minimal, one line, copyright

Keep window.API_ENDPOINT exactly as it is — do not change the API endpoint value.
Keep all booking logic in main.js exactly as it is — only restyle, do not break functionality.

---

### Task 2 — Deploy

Sync the redesigned frontend to S3:
```bash
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "max-age=31536000" --exclude "*.html"
aws s3 sync frontend/public/ s3://q-atelier-site --delete \
  --cache-control "no-cache" --include "*.html"
```

Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id E2LJC4OK76HPZO \
  --paths "/*"
```

---

### Task 3 — Update BUILD_LOG.md

Document everything that happened today:
- ACM cert validated after adding CNAME records to Vimexx DNS
- CloudFront deployed with real SSL cert and domain aliases
- CI/CD fully green (both Terraform and frontend deploy)
- SES sandbox still active — production access blocked until domain verified
- Frontend redesign completed
- Temporary CloudFront test URL: dyshhxdimbjli.cloudfront.net

---

### Task 4 — Commit everything
```bash
git add .
git commit -m "feat: romantic bridal redesign of frontend"
git push origin main
```