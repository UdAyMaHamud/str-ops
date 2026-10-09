# CLAUDE.md

STR Ops Dashboard: Express + MongoDB API in `backend/`, React (Vite) dashboard in `frontend/`.
Write all code in the **midu-style** conventions (github.com/midu100/midu-style-skill).
Everything in code and docs is in English.

## Commands

- API: `cd backend && npm start` (node --watch, port 8000). Empty `DB_STRING` = local DB on disk in `backend/.data` (`dbConfig/localDb.js`), mock data on first start
- Reseed (local or DB_STRING): `cd backend && npm run seed`. `SEED_MOCK=false` never loads mock data
- Dashboard: `cd frontend && npm run dev` (port 5173), `npm run build`

## How data reaches a panel

`models/xSchema.js` → `controllers/xController.js` → `routes/x.js` (mounted in `routes/index.js`)
→ `frontend/src/store/api/*Api.js` (RTK Query `injectEndpoints`) → `frontend/src/pages/X.jsx`.

- Responses are always `{ success, message, data }` sent with `res.status(code).send(...)`.
- List endpoints accept `?property=<id|all>` via `propertyFilter(req)` in `services/helpers.js`.
- KPI math (occupancy, ADR, RevPAR, host net) lives only in `backend/services/metrics.js`.
- Integration "normal vs worried" rules live in `backend/services/health.js`.
- Mock data lives in `backend/services/seed.js`, with dates relative to today.

## Auth (mirrors github.com/midu100/Air_Bnb)

- `controllers/authController.js`: signup → OTP email → verifyotp → signin. Plus resendotp, forgot/reset password, refreshtoken, logout and Google.
- Tokens only live in the httpOnly cookies `X_AS-TOKEN` (2h access) and `R_FS-TOKEN` (10d refresh). Never put a token in a
  response body or read it in the frontend. `authMiddleware` reads the cookie first, then the Bearer header as a fallback, and rejects refresh tokens.
- Frontend: `store/apiSlice.js` refreshes once on 401. `PersistAuth` asks `/auth/profile` on load.
- Email goes through `services/emailServices.js` (Gmail SMTP). Without SMTP it logs the code (dev only).
- Validation lives in `services/regexValidation.js`. Rate limits live in `middleware/rateLimiters.js` (`authLimiter` on credential routes).

## Roles and data scope

- Roles: `guest` (books on the public site), `client` (property owner), `trainee`, `senior`, `admin`. Sign-up creates `guest` or `client` (`as`), never staff.
- Guests never reach the dashboard API: those routers are mounted with `insiders` (`roleCheck('client', 'trainee', 'senior', 'admin')`).
- `middleware/ownerScopeMiddleware.js` sets `req.ownedProperties` for clients. Every list query must go
  through `propertyFilter(req)`, and single-property pages through `resolveProperty(req)`, so owners never see
  another owner's data.
- Staff-only routers are mounted with `roleCheck('trainee', 'senior', 'admin')` in `routes/index.js`.
- The frontend nav and route guards come from `frontend/src/components/admin/navItems.js` (`roles` per item).
- Public, no-auth data for the landing page lives in `routes/public.js`. Never return owner or guest fields there.

## Role homes

- `/dashboard` renders a different home per role from `pages/Overview.jsx`: `components/home/{OwnerHome,TraineeHome,SeniorHome,AdminHome}.jsx`.
- Data: `GET /home/{owner|trainee|senior|admin}` in `controllers/homeController.js` (role-checked), plus `/overview` for charts.
- Trainee academy: Day Cards in `services/trainingPlan.js` (Friday off), EOD reports in `models/eodSchema.js` and `controllers/trainingController.js`, team rows in `services/team.js`.
- Admin users and roles: `controllers/userController.js` (`/user`, admin only). Listing audit: `PATCH /property/:id/audit` (senior/admin).
- Sidebar per role: `NAV_BY_ROLE` in `components/admin/navItems.js`.

## Guest booking + Hostaway

- `services/quoteService.js` is the only place that turns dates into a price (min stay, max guests, availability). Bookings are `pending` until a senior confirms (`controllers/bookingController.js`); KPIs count `confirmed` only.
- Public stay data: `/public/stays/:id` and `/public/quote`. Only audited listings with a photo (`LIVE_QUERY`).
- Hostaway: `services/hostawayService.js` (token, paginated sync, mapping, upserts by `hostawayId`), webhook in `routes/webhook.js` (basic auth). Store the guest first name only.
- Payments are not built yet (Stripe needs keys).

## Frontend structure

- `/` public site: `layout/LayoutOne.jsx` + `pages/{Landing,Stays,StayDetails,Trips,Saved}.jsx` + `components/landing/*`, `components/stay/*` (HomeVision style, navy + sky).
- After sign-in each role lands via `landingPathFor` in `store/slices/authSlice.js` (guests → /trips, others → /dashboard).
- `/signin`, `/register`: `layout/AuthLayout.jsx`, Google button in `components/common/GoogleButton.jsx`.
- `/dashboard/*`: `layout/AdminLayout.jsx` (icon rail + "Hello, name!" top bar, Paperpillar style, sage green).
- Design tokens are in `src/index.css` `@theme`. Chart colors are in `components/common/chartSetup.js`.

## Adding a field or filter (Checkpoint 3 practice)

1. Add the field to the model in `backend/models/`, then to the seed data.
2. Return or filter it in the controller (copy `propertyFilter` for a new query param).
3. Pass the param in the matching `frontend/src/store/api/*Api.js` query.
4. Render it in the page. Reuse `Panel`, `StatusBadge`, `StatCard` from `src/components/common/`.

## Rules (from workbook Section 06)

- Never put API keys, passwords or tokens in code, seed data, prompts or screenshots. Use `.env`.
- Never add guest phone, ID, email or payment fields. Use reservation codes.
- Any new write endpoint must use `roleCheck('senior', 'admin')` unless trainees need it.
- Outgoing guest messages are drafts. Never add a route that sends directly.
- Every new panel states its data source and a "worried if…" rule (`Panel` `source` + `rule` props).
- Status colors (good / warning / serious / critical) always come with an icon + label (`StatusBadge`).
