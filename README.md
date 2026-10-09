# STR Ops

A short-term rental platform in three parts:

1. **Guest site** (`/`, `/stays`, role `guest`): browse stays, check live prices and availability, request to book, see My trips, save stays, review a finished stay.
2. **Owner dashboard** (`/dashboard`, role `client`): earnings, calendar, upcoming stays, decisions, repairs, reviews, monthly statement, for the owner's **own** properties only.
3. **Operations dashboard** (`/dashboard`, roles `trainee` / `senior` / `admin`): the team that runs every property. Each role has its own home. Built for the STR Operations Academy (see `REQUIREMENTS.md`).

- `backend/`: Express 5 + Mongoose 9 API (CommonJS)
- `frontend/`: React 19 + Vite, React Router v7, RTK Query, Tailwind v4, chart.js

## Run it

```bash
cd backend && npm install && npm start      # API on :8000
cd frontend && npm install && npm run dev   # site + dashboard on :5173
```

Without `DB_STRING` the API uses a **local database stored in `backend/.data`**, which is kept between restarts and filled with
mock data the first time. `npm run seed` (in `backend/`) wipes it and reloads fresh mock data.

### Demo accounts (one-click buttons on the sign-in page)

| Role | Email | Password | Lands on |
|---|---|---|---|
| Guest | guest@strops.test | Guest@123 | My trips (has a confirmed trip, a past trip to review and a pending request) |
| Owner | client@strops.test | Client@123 | Owner home (P1 + P2) |
| Owner | owner2@strops.test | Client@123 | Owner home (P3 + P4) |
| Trainee | trainee@strops.test | Trainee@123 | Day 20 Day Card, shift queue, EOD report |
| Trainee | trainee2@strops.test | Trainee@123 | Day 9 |
| Senior | senior@strops.test | Senior@123 | Review queue (booking requests, drafts, QC, escalations) |
| Admin | admin@strops.test | Admin@123 | Platform home + go-live checklist |

## Going live: the order

The admin home has a **Go-live checklist** that turns green as each item is set. All values go in the `.env` files only.
Never paste them into chat, tickets or AI prompts.

### 1. Real database (MongoDB Atlas)
1. Create a free cluster at https://www.mongodb.com/atlas, add a database user, and allow your server's IP.
2. Copy the connection string into `backend/.env` → `DB_STRING=mongodb+srv://...`
3. Restart the API. Run `npm run seed` once if you want the demo data there too.

### 2. Email codes + Google sign-in
- **Gmail:** turn on 2-step verification, create an *App password*, then set `SMTP_USER` (the Gmail address) and `SMTP_PASS` (the app password).
- **Google:** in Google Cloud Console create an *OAuth client ID* (Web application) with your site under *Authorized JavaScript origins*.
  Put the same ID in `backend/.env` → `GOOGLE_CLIENT_ID` and `frontend/.env` → `VITE_GOOGLE_CLIENT_ID`.
- Also set a long random `JWT_SECRET` (32+ characters).

### 3. Guest booking site (built)
- Only listings that a senior has **audited** and that have a photo are public and bookable.
- Prices come from the pricing calendar (`services/quoteService.js` is the only place that turns dates into money). Checks: min stay, max guests, max 30 nights, no double booking.
- A booking is a **request**: the senior home shows it with Confirm / Decline, and the guest's message lands in the team inbox.
  **No payment is taken yet.** Card payments (Stripe, as in the Air_Bnb project) need Stripe keys and are the next step.

### 4. Hostaway
1. In Hostaway: *Settings → Hostaway API* → create an API key. Set `HOSTAWAY_ACCOUNT_ID` and `HOSTAWAY_API_KEY`.
2. The API syncs listings + reservations on start and every `HOSTAWAY_SYNC_MINUTES` (default 15). Admins also get **Sync now** on the checklist.
3. For instant updates, add a webhook in Hostaway pointing to `https://<your-api-domain>/webhooks/hostaway`, with basic auth set to
   `HOSTAWAY_WEBHOOK_USER` / `HOSTAWAY_WEBHOOK_PASS` (the endpoint refuses everything until both are set).
4. New Hostaway listings arrive without an owner and without an audit: an admin assigns the owner on **Properties**, a senior audits it.
5. Only the guest's **first name** is stored from Hostaway. Phone, email and full name are dropped.
6. Once real data flows: set `SEED_MOCK=false` and start from an empty database so mock data never mixes in.

Field names for fees can differ per Hostaway account. If a channel fee is missing, the sync estimates it (Airbnb 15.5%, VRBO 8%,
Booking.com 15%) for host-net only. Check the first sync against a few real reservations.

## How sign-in works (same flow as the Air_Bnb project)

1. **Register** as *Book stays* (guest) or *List my property* (owner). The server emails a 4-digit code. Staff roles are only given by an admin.
2. **Verify** at `/verify-otp` (codes expire after 5 minutes; "Resend code" sends a new one).
3. **Sign in**: httpOnly cookies `X_AS-TOKEN` (2 h) + `R_FS-TOKEN` (10 days). JavaScript never sees them; the app refreshes silently.
4. **Forgot password** → emailed code → `/reset-password`.

Credential endpoints are rate limited (20 attempts / 15 min) and every response has Helmet security headers.

## Who sees what

| Area | Guest | Owner | Trainee | Senior | Admin |
|---|---|---|---|---|---|
| Stays, booking, My trips, Saved | ✓ | | | | |
| Dashboard (own properties only) | | ✓ | | | |
| Dashboard (all properties) | | | read + drafts + EOD | approve + decide | everything |
| Inbox, Screening, Integrations, Escalations, Training | | | ✓ | ✓ | ✓ |
| Users, owner assignment, Hostaway sync | | | | | ✓ |

The API enforces this: guests are refused on every dashboard route, `ownerScope` limits owners to their own properties,
staff-only and admin-only routers are role-checked in `routes/index.js`.

Property photos are from Unsplash (free to use under the Unsplash license).
