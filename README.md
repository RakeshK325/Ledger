# MiniLedger

MiniLedger is a personal accounting application built to track money lent to friends, designed with a tactile 1938 British-Indian Paper Ledger aesthetic. It pairs a Node.js + Express + Prisma + PostgreSQL backend with an Expo (React Native) + Expo Router frontend.

### Features
- **Phone Login & Mock OTP**: Indian 10-digit phone verification with bcrypt-hashed OTPs, 5-minute expiry, rate limiting, and 3-attempt lockout.
- **Paper Ledger Aesthetic**: Warm unbleached paper palette (`#F3ECDD`), double vertical red margin rules (`#C2473A`), authentic rubber verification stamps (`OVERDUE`, `PAID`, `PENDING`), Fraunces serif typography, and IBM Plex Mono numerals.
- **Derived Loan Statuses**: Status is strictly computed on read (`pending`, `overdue`, `repaid`) without storing stale state in the database.
- **Totals Sheet Summary**: Aggregated `LENT / DR`, `REPAID / CR`, and `OVERDUE` figures computed in a single SQL query; overdue balances highlight in Margin Red when above zero.
- **Client-Side Filter Tabs**: Filter records across `ALL`, `PENDING`, `OVERDUE`, and `REPAID`.
- **Ruled Ledger FlatList**: Virtualized list on 1px ruled lines. Overdue rows feature an 8% red tint, 3px red left rule, and `OVERDUE` stamp. Repaid rows feature struck-through amounts and a `PAID` stamp.
- **Receipt Vouchers**: Capture paper receipt photos via device camera or photo library; attachments display as voucher thumbnails and expandable bottom-sheet scans.
- **Bottom Sheet Settlement & Haptic Celebration**: Tap any record to inspect particulars. Settling a debt triggers native confirmation, an animated scale-in `PAID` stamp (1.4× to 1.0×), and light haptic feedback.
- **Instant Demo Seeder**: Includes an idempotent database seeder generating a demo user (`9999999999`) and 8 realistic loans.

---

## Prerequisites

- **Node.js**: v20+ (`node -v`)
- **Docker & Docker Compose**: For running PostgreSQL 16
- **Expo Go App**: Installed on an iOS or Android physical device, or an Android Emulator / iOS Simulator

---

## Quickstart & Exact Run Steps

### 1. Start the PostgreSQL Database
```bash
docker compose up -d
```
*Starts PostgreSQL 16 on port `5432` with databases `miniledger` (development) and `miniledger_test` (automated tests).*

### 2. Set Up & Run the Backend
```bash
cd backend
cp .env.example .env
npm i
npm run migrate
npm run seed
npm run dev
```
*The backend API will start at `http://localhost:4000/api`.*

### 3. Set Up & Run the Mobile App
Open a new terminal:
```bash
cd mobile
npm i
```
Configure your API URL in `mobile/.env` (see the **API URLs Guide** below):
```bash
cp .env.example .env
```
Start Expo:
```bash
npx expo start
```
Scan the displayed QR code with the **Expo Go** camera (Android) or default Camera app (iOS), or press `a` for Android Emulator / `i` for iOS Simulator.

---

## API URLs Guide

Set `EXPO_PUBLIC_API_URL` inside `mobile/.env` according to your environment:

| Client Environment | `EXPO_PUBLIC_API_URL` Setting | Explanation |
| :--- | :--- | :--- |
| **Physical Phone (Expo Go)** | `http://<YOUR_LAN_IP>:4000/api` | A physical phone cannot reach `localhost`. Use your computer's local Wi-Fi/LAN IP (e.g. `http://192.168.1.50:4000/api`). |
| **Android Studio Emulator** | `http://10.0.2.2:4000/api` | Android Emulator routes `10.0.2.2` directly to the host machine's loopback interface. |
| **iOS Simulator** | `http://localhost:4000/api` | The iOS Simulator shares the host network stack directly. |
| **Web Browser (`npm run web`)**| `http://localhost:4000/api` | Web browser runs directly on the host machine. |

---

## Mock OTP & Demo Credentials

Because SMS gateways require paid vendor credentials, verification codes are logged directly to stdout.

1. **Demo Account**:
   - Phone: `99999 99999`
   - Fixed OTP: `123456` (pre-seeded for instant evaluation)
   - Includes 8 pre-seeded loans (overdue, repaid, pending) totaling ₹22,800.
2. **Any Other Indian Phone Number** (e.g., `98765 43210`):
   - Enter your number on the login screen and tap **SEND CODE**.
   - Watch the backend terminal log for:
     ```text
     [MOCK OTP] +919876543210 -> 482910
     ```
   - Enter the printed 6-digit code to log in.

---

## API Reference

Base Path: `/api`

| Method | Path | Auth Required | Request Body | Response (Success) |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | None | `{ "ok": true }` |
| `POST` | `/auth/request-otp` | No | `{ "phone": "9876543210" }` | `{ "ok": true }` |
| `POST` | `/auth/verify-otp` | No | `{ "phone": "9876543210", "code": "123456" }` | `{ "token": "<JWT>", "user": { "id", "phone", "created_at" } }` |
| `GET` | `/auth/me` | Yes (Bearer) | None | `{ "user": { "id", "phone", "created_at" } }` |
| `GET` | `/loans` | Yes (Bearer) | Optional query `?status=pending\|overdue\|repaid` | `{ "loans": [ { "id", "friend_name", "amount_paise", "due_date", "repaid_at", "status", "receiptUrl", "created_at" } ] }` |
| `POST` | `/loans` | Yes (Bearer) | `multipart/form-data`: `friend_name` (1-80 chars), `amount` (string decimal), `due_date` (YYYY-MM-DD), optional `receipt` (image file) | `{ "loan": { ... } }` (Status `201`) |
| `PATCH` | `/loans/:id/repay` | Yes (Bearer) | None | `{ "loan": { ... } }` |
| `GET` | `/summary` | Yes (Bearer) | None | `{ "totalLent": <paise>, "totalRepaid": <paise>, "overdueAmount": <paise> }` |

*All error responses follow the standard shape: `{ "error": { "code": string, "message": string } }`.*

---

## Running the Test Suite

The backend integration test suite runs against the dedicated `miniledger_test` database (tables are truncated before each suite):

```bash
cd backend
npm test
```

Test coverage includes:
1. `auth.test.ts`: Phone validation, rate limiting (3 requests per 10m), hash verification, expiry, and 3-attempt lockout.
2. `loans.test.ts`: Multipart uploads, rupee-to-paise conversion, positive amount checks, future due date validation, 5 MB file size limit, and user data scoping.
3. `repay.test.ts`: Idempotent loan repayment, unauthorized loan access prevention.
4. `summary.test.ts`: Exact SQL aggregate calculations and overdue exclusion tests.
5. `auth-guard.test.ts`: Rejection of missing, malformed, or untrusted tokens across all protected routes.
6. `health.test.ts`: Health check probe.

---

## Design Decisions

- **Integer Paise Representation**: Currency is strictly stored and computed as integer paise (`amount_paise`). Floating-point arithmetic is never used for currency to prevent fractional inaccuracies. Conversion to ₹ only occurs at the UI boundary (`formatINR`).
- **Derived Loan Status**: Loan status is never persisted as a database column. It is dynamically computed at query time: `repaid` if `repaid_at IS NOT NULL`; `overdue` if `repaid_at IS NULL AND due_date < CURRENT_DATE`; otherwise `pending`. This guarantees that loans become overdue automatically as days pass without background cron updates.
- **One-Query Summary**: The dashboard totals are computed in a single PostgreSQL query using `COALESCE(SUM(amount_paise) FILTER (...), 0)` rather than multiple queries or in-memory application looping.
- **404 Instead of 403**: For privacy and security, attempting to read, update, or repay a loan belonging to another user returns `404 NOT_FOUND` rather than `403 FORBIDDEN`. This completely conceals whether a particular loan ID exists.
- **Local Disk Uploads**: File uploads are processed via Multer directly to local disk storage (`backend/uploads`) and served statically at `/uploads`. This eliminates external cloud dependencies and allows the entire stack to run offline.

---

## Known Limitations & Next Steps

1. **Production SMS Gateway**: Replace the console mock with Twilio, AWS SNS, or Gupshup for delivering actual OTP SMS messages.
2. **Object Storage for Receipts**: Transition receipt storage from local disk to an Amazon S3 or Google Cloud Storage bucket with pre-signed upload URLs and CDN delivery.
3. **Session Refresh Tokens**: Supplement the 7-day JWT with short-lived access tokens (15m) and sliding refresh tokens stored in Redis.
4. **Cursor-based Pagination**: Implement cursor pagination on `GET /api/loans` to support accounts with hundreds of historical transactions without loading all records into memory.
