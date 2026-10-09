# STR Ops Dashboard — Requirements

Source: *STR Operations Academy — Trainee Workbook* (Days 1–24, Sections 02–06).
The dashboard is the single screen where a VA runs daily operations for a US short-term-rental
portfolio. Trainees learn it in staging (Day 15), extend it with Claude Code (Day 18), and run a
4-property portfolio from it in the capstone (Days 22–23).

## 1. Data sources (integrations)

| Source | Feeds | Ref |
|---|---|---|
| PMS: Hostaway / Guesty / Hospitable | Listings, reservations, owner blocks, unified inbox, cleaning tasks, occupancy/ADR reports | D3, D13 |
| Channels: Airbnb, VRBO, Booking.com, Expedia, Direct | Booking source, channel split, OTA fees, reviews | D2, D11 |
| PriceLabs | Daily prices, base/min/max price, min stay, 60-day calendar | D7, D13 |
| Minut | Noise alerts | D5 |
| Domotz | Wi-Fi / network alerts | D5 |
| Smart lock | Door code / lock events | D5 |
| Screening tool | Risk score, flags, ID-verification status | D9 |
| n8n | Workflow health, error log, booking webhooks, Slack alerts | D16, Track 5 |

Data arrives by **webhook** (push, e.g. new booking) or **polling** (pull on a schedule). Every panel
must show its source tool and last update time.

## 2. Panels

1. **Portfolio KPIs**: Revenue, Occupancy (booked ÷ available nights), ADR (revenue ÷ booked nights),
   RevPAR (revenue ÷ available nights), Host net (revenue − OTA fee − cleaning − software).
   Compare with last month and the market. Filter by property. *(D1, Owner Report)*
2. **Today / Next 24 h**: Check-ins, checkouts, turnovers and open alerts. This is the "morning check"
   panel. *(D22)*
3. **Inbox & Messaging**: Unread threads, response time and response rate, message timeline stage
   (booking → 3 days before → check-in → mid-stay → day before checkout → after checkout).
   Drafts awaiting approval with Approved/Edited/Rejected status and approval rate %. *(D4, D20)*
4. **Turnover & Cleaning**: Cleaning tasks linked to checkouts, Photo QC result (approve/reject + reason
   by area: bedrooms, bathroom, kitchen, living, supplies, damage), low-supply flags. *(D5, Track 3)*
5. **Smart Home Alerts**: Minut noise, Domotz Wi-Fi and lock alerts, each with its first-response action. *(D5)*
6. **Pricing**: 60-day calendar, local events/holidays, current vs suggested price, change %, min stay,
   gap nights flagged, min/max sanity check. *(D7, Template A)*
7. **Listings**: Audit score per listing (8 checks × 0–2 = /16). *(D8, Template B)*
8. **Screening / Trust & Safety**: Reservation code, risk score, flags, decision
   (Approve / Investigate / Recommend Decline), one-line reason, pending ID verifications. *(D9, Template D)*
9. **Reviews & Claims**: Average rating, negative reviews without a reply, open damage claims with
   **filing-deadline countdown** and evidence-pack checklist progress. *(D10, Template E)*
10. **Maintenance**: Tickets showing property, issue, urgency, vendor, status (open → closed) and photos. *(D11)*
11. **Owner Report**: Monthly one-pager covering headline, numbers, bookings (count, avg LOS, channel split),
    guest feedback, operations/costs and next-month plan. *(D11, D23, Template F)*
12. **Integration & Automation Health**: Per tool: last sync, mode (webhook/polling), last status code
    (200/201/400/401/404/429/500) with plain-English meaning. n8n workflow status and 7-day error log
    grouped by cause. *(D13, D15, Track 5)*
13. **Escalation directory**: Problem type → who to contact, plus urgency levels (Now / Within 1 hr / Today).
    *(D15, Escalation Report)*

Each key panel defines **"normal" vs "worried" thresholds** so anomalies stand out, for example no new
bookings in X hours, or a 401 from a tool. *(D15)*

## 3. Rules the dashboard must enforce

- **No guest PII**: Identify guests by reservation code (first name at most). Never show IDs, phone
  numbers or payment details. *(Security Rule 4)*
- **No secrets in the UI or code**: API keys stay in the secret store / n8n credentials. *(Rule 1)*
- **Read-only by default**: Write actions are gated by role and track. *(Rule 2)*
- **Staging vs Production**: A clear environment banner. Staging uses mock data. *(Rule 3)*
- **Draft, don't send**: Outgoing messages are drafts until a senior approves them. *(Rule 5)*
- **Time zones**: Property local (US) time plus team time (BD). *(Section 01)*
- **Easy to extend**: Small, well-named components so a trainee can add a field or filter with
  Claude Code and read the diff. Include a `CLAUDE.md`. *(D14, D18)*

## 4. Mock data needed

4 properties (capstone portfolio) with 30 days of bookings, a 60-day price calendar, 8 screening
profiles, 5 negative reviews, 1 damage case, sample alerts, maintenance tickets and n8n runs.
