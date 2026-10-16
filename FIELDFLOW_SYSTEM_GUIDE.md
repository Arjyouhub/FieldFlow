# FIELDFLOW — PLATFORM ARCHITECTURE & RUN GUIDE

FieldFlow is a production-grade, secure, multi-tier field collection management platform consisting of:

1. **Field Staff Android App** (React Native + Expo SDK 57 in root `/`)
2. **Admin Management Website** (React + Vite in `/admin`, Port 3000)
3. **Developer Monitoring Website** (React + Vite in `/developer`, Port 3001)
4. **Shared Backend API & Geospatial Engine** (Node.js + Express + MongoDB in `/backend`, Port 5000)

---

## 🚀 Quick Start Instructions (Run in VS Code)

### 1. Start Backend API Server
```powershell
cd backend
npm run dev
```
* **Server Port:** `http://localhost:5000`
* **Health Endpoint:** `http://localhost:5000/api/health`

### 2. Start Admin Website (Operational Control Center)
Open a new terminal in VS Code:
```powershell
cd admin
npm run dev
```
* **URL:** `http://localhost:3000`
* **Admin Login:** Phone: `9876543210` | Password: `password123`

### 3. Start Developer Monitoring Portal (Telemetry & Security)
Open a new terminal in VS Code:
```powershell
cd developer
npm run dev
```
* **URL:** `http://localhost:3001`
* **Developer Login:** Phone: `9876543212` | Password: `password123`

### 4. Start Staff Android App
Open a new terminal in VS Code:
```powershell
npm run android
# Or for Web preview:
npm run web
```
* **Staff Login:** Phone: `9876543211` | Password: `password123`

---

## 🔑 Demo Credentials Matrix

| Application | Role | Phone / Username | Password | Permitted Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Website** | `admin` | `9876543210` | `password123` | Case imports, payments, staff management, GPS review |
| **Staff Android App**| `staff` | `9876543211` | `password123` | Assigned cases, 100m GPS visit, collections, calls |
| **Developer Portal** | `developer` | `9876543212` | `password123` | System metrics, logs, session revocation, security events |

---

## 🧪 Automated Test Suite

Run all automated unit and integration tests:
```powershell
cd backend
npm test
```
* **Haversine Distance Tests:** 10/10 passed (identical coords, known points, 100m boundary, duplicate detection).
* **API & Security RBAC Tests:** 12/12 passed (token generation, RBAC permission boundary, GPS matching, payment audit).
* **Total Passing Tests:** 22/22 passed.

---

## 🛡️ Production & External Services Checklist

1. **MongoDB Atlas:** Set `MONGODB_URI` in `backend/.env` with your production connection string.
2. **SMS Gateway:** For production OTP SMS delivery, plug your Twilio/AWS SNS/Fast2SMS credentials into `authController.js:requestOtp`.
3. **Cloud Object Storage:** For multi-region photo evidence storage, swap local disk uploads with AWS S3 / Cloudflare R2 presigned URLs.
4. **HTTPS Certificates:** Enable TLS 1.3 reverse proxy (Nginx or Caddy) in front of Node.js.
