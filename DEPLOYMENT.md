# FIELDFLOW — FIELD COLLECTION MANAGEMENT PLATFORM
## Comprehensive Architecture, Setup, and Operational Guide

FieldFlow is an enterprise-grade Field Debt Collection and Verification platform engineered with strict role-based access control (RBAC), multi-portfolio loan management, geofenced GPS verification, and real-time reconciliation.

---

## 1. System Components

The platform consists of four unified modules connected to the authorized backend:

| Module | Technology | Default Port | Description |
|---|---|---|---|
| **Backend API Engine** | Node.js, Express, MongoDB (Mongoose) | `5000` | REST API, Haversine verification engine, RBAC, bulk importer, and audit logger |
| **Field Staff Mobile App** | React Native, Expo SDK 57 | `8081` | Mobile-first Android/iOS app with GPS distance calculations, offline awareness, visit logging |
| **Admin Operations Portal** | React, Vite, Lucide Icons | `3000` | Administrative control: portfolios, cases, staff, batches, payment & suspicious visit approvals |
| **Developer Monitoring Portal** | React, Vite | `3001` | System telemetry, API error rates, database health, and integration diagnostics |

---

## 2. Development-Only Demo Credentials

> [!NOTE]
> Demo accounts are populated by running `npm run seed` in the `backend/` directory.

| Role | Mobile / Username | Password | Name / Details |
|---|---|---|---|
| **SUPER_ADMIN** | `9876543210` | `password123` | Operations Director (Full Administrative Access) |
| **FIELD_STAFF (1)** | `9876543211` | `password123` | Rahul Kumar (Assigned Area: Kozhikode Central) |
| **FIELD_STAFF (2)** | `9876543213` | `password123` | Priya Sharma (Assigned Area: Palakkad North) |
| **DEVELOPER** | `9876543212` | `password123` | Systems Lead (Diagnostics & Telemetry Portal) |

---

## 3. Quickstart & Local Execution

### Prerequisites
- Node.js >= 18.x
- MongoDB running locally on `mongodb://localhost:27017/fieldflow`
- Expo CLI (`npm install -g expo-cli` or `npx expo`)

### Step 1: Database Seeding & Backend API
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Seed demo portfolios, customers, batches, cases, and test scenarios
npm run seed

# Run automated unit and integration tests (27/27 tests)
npm test

# Launch backend in development mode
npm run dev
# Backend API will be active on http://localhost:5000
```

### Step 2: Admin Operations Portal
```bash
# Navigate to admin directory
cd admin

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Admin portal will be active on http://localhost:3000
```

### Step 3: Developer Monitoring Portal
```bash
# Navigate to developer directory
cd developer

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Developer portal will be active on http://localhost:3001
```

### Step 4: Field Staff Mobile App (Expo)
```bash
# In the project root directory
npm install

# Start Expo dev server
npx expo start
# Press 'a' to open on an Android emulator/device or scan QR code via Expo Go
```

---

## 4. Key Architectural Features Implemented

### A. Finance Portfolio & Case Separation
- **Independent Concepts**: Customer Identity, Lending Portfolio, Monthly Batch, and Loan Cases are decoupled. The same borrower can have independent cases in KreditBee, Money Smart, and SmartCoin without balance collisions.
- **Pre-configured Portfolios**:
  - `KreditBee` (`KBEE`) — 100m geofence radius
  - `Money Smart` (`MSMART`) — 100m geofence radius
  - `SmartCoin` (`SCOIN`) — 100m geofence radius
  - `Bajaj Finserv` (`BAJAJ`) — 100m geofence radius
- **Live Aggregated Stats**: Portfolios compute live recovery rates, broken PTPs, suspicious visits, and verified payments directly from backend queries.

### B. Bulk Excel/CSV Import Workflow
- Located in Admin Portal -> **Bulk Import** (`/api/cases/import-bulk`).
- **Required Steps**:
  1. Mandatory Portfolio selection (with instant inline "Create Portfolio" option).
  2. Monthly Batch selection or creation (e.g., `OCT-2026`, `NOV-2026`).
  3. Drag-and-drop file upload (`.xlsx`, `.xls`, `.csv`).
  4. Automatic column mapping preview and row-level validation.
  5. Duplicate detection preventing duplicate account injection upon re-upload.
  6. Default or row-specific staff assignment.
  7. Success, duplicate, and failed row counter with downloadable `.xlsx` error report.

### C. Configurable 100-Metre GPS Verification Engine
- Uses high-precision spherical trigonometry (**Haversine Formula**) implemented in `backend/src/utils/geo.js` and `src/utils/geo.ts`.
- **Logic Rules**:
  - Distance $\le 100\text{m}$ from at least one verified customer location: `LOCATION_MATCHED` (Trusted).
  - Distance $> 100\text{m}$ with GPS accuracy $\le 50\text{m}$: `OUTSIDE_RADIUS` (Flagged as Suspicious Event for supervisor review).
  - GPS accuracy $> 50\text{m}$ (poor signal): `ACCURACY_POOR` (Flagged as Needs Review without penalizing staff).
  - First customer visit: `FIRST_VISIT_PENDING` (Allows capturing and submitting initial coordinates).

### D. Supervisor Suspicious Visits Review (4 Actions)
Located in Admin Portal -> **Suspicious Visits**:
1. **Confirm Location Mismatch** (`CONFIRM_MISMATCH`): Confirms geofence breach; updates case audit history.
2. **Approve Legitimate Alternate Location** (`APPROVE_ALTERNATE`): Automatically registers and verifies the new coordinates as an approved customer site (e.g. Workplace, Relative's House).
3. **Request More Evidence** (`REQUEST_EVIDENCE`): Flags record for further field proof.
4. **Mark False Alert** (`FALSE_ALERT`): Dismisses alert caused by dense urban GPS drift.

### E. Field Staff Mobile Experience
- **Top Portfolio Selector**: Horizontal carousel allowing staff to filter their assigned cases by authorized portfolio or view all.
- **10 Status & Spatial Filters**:
  1. All Cases
  2. Nearest Cases (Live GPS calculation via `expo-location` and Haversine sorting)
  3. Pending Cases
  4. Visited Cases
  5. Paid Cases
  6. PTP Cases
  7. Broken PTP
  8. Non-Workable Cases
  9. Suspicious Cases
  10. Pending Verification
- **9 KPI Metrics**: Real-time counts synchronized with backend allocations.
- **Customer Details & Photos**: Direct dialer, map launcher, customer picture display, and multiple saved location review.

### F. Payment Submission & Approval Security
- When staff collect payment (Cash, UPI, Bank Transfer), case status enters `pending_verification`.
- Staff **cannot** mark a case as `paid` unilaterally.
- Admin reviews transaction reference, collected amount, and receipt photo under **Payment Verification**. Upon admin approval, the case transitions to `paid` and customer balance reduces.

---

## 5. Automated Acceptance Test Results

Run all test suites using `npm test` inside `backend/`:

```
TAP version 13
ok 1 - FieldFlow API Integration Tests (12 tests passed)
ok 2 - FieldFlow GPS Verification Engine Tests (10 tests passed)
ok 3 - FieldFlow Portfolio & Case Architecture Tests (5 tests passed)

# tests 27
# suites 6
# pass 27
# fail 0
```

---

## 6. Production Deployment & MongoDB Atlas Setup Guide

### A. Setting Up MongoDB Atlas (Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free or dedicated cluster (e.g. AWS Mumbai `ap-south-1` for minimum latency in India).
2. Under **Database Access**, create a database user:
   - Username: `fieldflow_admin`
   - Password: `<Choose a strong password>`
   - Role: `Read and write to any database`
3. Under **Network Access**, whitelist connections:
   - Add IP Address: `0.0.0.0/0` (Allow Access from Anywhere) or specify your production server's static IP.
4. Go to **Database -> Connect -> Drivers (Node.js)**:
   - Copy the SRV URI connection string:
     ```
     mongodb+srv://fieldflow_admin:<password>@cluster0.abcde.mongodb.net/fieldflow?retryWrites=true&w=majority
     ```
5. Replace `<password>` with your database user password and specify `/fieldflow` as the database name.

### B. Production Environment Variables (`backend/.env`)
Set these environment variables on your production hosting server (Render, Railway, AWS, DigitalOcean, Docker):

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://fieldflow_admin:YourSecretPassword123@cluster0.abcde.mongodb.net/fieldflow?retryWrites=true&w=majority
DB_MAX_POOL_SIZE=50
DB_MIN_POOL_SIZE=5
JWT_SECRET=super_secret_64_character_production_key_fieldflow_2026_xyz
JWT_EXPIRES_IN=7d
DEFAULT_RADIUS_METRES=100
MAX_ALLOWED_ACCURACY_METRES=50
CORS_ORIGIN=https://admin.fieldflow.com,https://fieldflow-admin.vercel.app
```

### C. Admin Operations Portal Deployment (Vercel / Netlify)
1. In the `admin/` directory, set the production environment variable:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```
2. Build command:
   ```bash
   cd admin && npm run build
   ```
3. Output directory: `admin/dist`

### D. Production Hardening Features Implemented
- **Connection Pooling**: `maxPoolSize: 50`, `minPoolSize: 5` with 45s socket timeout and automatic re-connection.
- **Graceful Shutdown**: Intercepts `SIGTERM` and `SIGINT`, closes HTTP listeners, drains requests, and cleanly closes MongoDB connections.
- **Security Headers**: Powered by `helmet` with `cross-origin` resource policy for evidence photos and `x-powered-by` suppression.
- **Data Compression**: Gzip/Deflate compression enabled for all REST payloads and large Excel report responses.
- **Stack Trace Suppression**: Full stack traces hidden from external clients in production (`NODE_ENV=production`).

