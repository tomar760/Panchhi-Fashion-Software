<div align="center">

# 🪶 House of Panchhi HR Software

### *A complete, free, multi-user HR Management System built for House of Panchhi (Fashion)*

[![Live](https://img.shields.io/badge/Live-GitHub_Pages-6c47ff?style=for-the-badge&logo=github)](https://tomar760.github.io/Panchhi-Fashion-Software/)
[![Backend](https://img.shields.io/badge/Backend-Google_Apps_Script-4285F4?style=for-the-badge&logo=google)](https://script.google.com/)
[![Database](https://img.shields.io/badge/Database-Google_Sheets-34A853?style=for-the-badge&logo=googlesheets)](https://sheets.google.com/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)]()

**Zero hosting cost · Zero database cost · Built in pure HTML/CSS/JS**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Why This Stack](#-why-this-stack)
- [Architecture](#-architecture)
- [Modules](#-modules)
- [File Structure](#-file-structure)
- [Setup Guide](#-setup-guide)
- [Multi-User System](#-multi-user-system)
- [Business Rules](#-business-rules)
- [Tech Stack](#-tech-stack)
- [Roadmap](#-roadmap)
- [Future Technology Upgrades](#-future-technology-upgrades)
- [Credits](#-credits)

---

## 🎯 Overview

**House of Panchhi HR Software** is a complete, web-based HR Management System built from scratch for a fashion company with ~309 employees across multiple departments. It replaces manual Excel-based HR processes with a fast, automated, multi-module digital system — without paying a single rupee in hosting or database fees.

**Built for real-world daily use:**
- Upload biometric attendance → auto-generate Late/Absent reports in under 2 minutes (was 30+ minutes manually)
- Manage 309+ employees with bulk MIS import
- Track gate passes, leaves, salary, store inventory — all from one dashboard
- Multi-user access with role-based permissions
- Real-time activity logging — see who changed what, when

---

## 💡 Why This Stack

| Requirement | Traditional Solution | This Project's Solution |
|---|---|---|
| Hosting | AWS / Hostinger (₹500+/mo) | **GitHub Pages — FREE** |
| Database | MySQL / MongoDB hosting | **Google Sheets — FREE** |
| Backend API | Node.js server (paid hosting) | **Google Apps Script — FREE** |
| Authentication | Auth0 / Firebase Auth | **Custom + Gmail OTP — FREE** |
| File Storage | AWS S3 | **Google Drive — FREE (15GB)** |

**Total monthly cost: ₹0**

This architecture proves a production-grade internal business tool doesn't need a traditional backend stack — Google's free tools, used creatively, can power a real company's daily operations.

---

## 🏗 Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   GitHub Pages   │ ──────► │  Google Apps Script   │ ──────► │  Google Sheets   │
│  (Frontend HTML) │  HTTPS  │   (Backend/API)       │  Native │  (Database)      │
│                  │ ◄────── │                       │ ◄────── │                  │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
        │                              │
        │                              ├──► Gmail (OTP & Notification Emails)
        ▼                              └──► Google Drive (File Attachments)
┌─────────────────┐
│  localStorage    │   ← Fast cache layer, GSheet remains source of truth
│  (Browser Cache) │
└─────────────────┘
```

**Data flow:**
1. User performs action (e.g., add employee) → instantly saved to `localStorage` (fast UI)
2. Same data sent asynchronously to Google Sheet via Apps Script Web App (`POST`, `no-cors`)
3. On page load / refresh → data pulled fresh from Google Sheet (source of truth)
4. Every write operation logged to **Activity Log** sheet with timestamp + user

---

## 🧩 Modules

| Module | Status | Description |
|---|:---:|---|
| 📊 **Dashboard** | ✅ Live | Real-time stats, attendance charts, birthday/probation alerts, quick actions |
| 👥 **Employee Directory** | ✅ Live | 309+ employees, MIS bulk import, full profile, leave balance, tags (3-HR Grace, 31-Day Bonus) |
| 🕐 **Attendance** | ✅ Live | Biometric XLS upload, auto Late/Absent detection, WhatsApp-ready reports, PDF/Excel export |
| 🚪 **Gate Pass** | ✅ Live | Early-going tracking, live outside-status, monthly summary, 3-HR grace tracking |
| 📅 **Leave Management** | ✅ Live | PL/SL/LWP wallet system, medical certificate upload, approval workflow |
| 💰 **Salary / Payroll** | ✅ Live | Auto calculation, advance/loan EMI, 31-day bonus logic, payslip generation |
| 📦 **Store & Inventory** | ✅ Live | PO/PR tracking with reminders, vendor management, Drive attachment support |
| 📈 **Analytics** | ✅ Live | Department splits, attendance trends, salary trends, pending action alerts |
| 🏢 **Teams** | ✅ Live | Department-wise cards with live attendance %, drill-down team tables |
| 🔐 **User Management** | ✅ Live | Multi-user accounts (max 10), role/permission system, activity log |
| 🔑 **Login + OTP** | ✅ Live | Email/password auth, Gmail-based OTP password reset |
| 🌙 **Dark Mode** | 🔜 Planned | System-wide theme toggle |
| 📁 **Drive Integration** | 🔜 Planned | Store module attachments → Google Drive |

---

## 📁 File Structure

```
Panchhi-Fashion-Software/
│
├── login.html              # Authentication + OTP password reset
├── index.html               # Dashboard
├── employees.html           # Employee Directory
├── attendance.html          # Attendance + Late/Absent reports
├── gatepass.html             # Gate Pass tracking
├── leave.html                # Leave Management (PL/SL/LWP)
├── salary.html                # Salary/Payroll calculation
├── store.html                  # Store & Inventory
├── analytics.html               # Analytics Dashboard
├── teams.html                    # Teams/Department view
├── users.html                     # User Management + Activity Log
│
├── assets/
│   ├── css/
│   │   └── style.css        # Shared design system
│   ├── js/
│   │   └── app.js            # Shared logic, GSheet API, utilities
│   └── img/
│       ├── hop-logo-main.png  # Login page logo
│       └── hop-logo-wings.png # Sidebar + favicon
│
├── backend/
│   └── Code.gs               # Google Apps Script (reference copy)
│
├── PROJECT_PROMPT.md         # Full project context for AI handoff
└── README.md                  # This file
```

> 💡 **Why separate HTML files per module?** Each page is self-contained so updating one module (e.g., Attendance) only requires replacing one file on GitHub — no risk of breaking other pages, no build step, no bundler needed.

---

## ⚙️ Setup Guide

### 1. Google Sheet Setup
1. Create a new Google Sheet — name it `Panchhi HR Data`
2. Copy the Sheet ID from the URL (`docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`)

### 2. Apps Script Backend
1. In the Sheet → **Extensions → Apps Script**
2. Delete default code, paste contents of `backend/Code.gs`
3. Update these two lines at the top:
   ```js
   const SHEET_ID    = 'YOUR_SHEET_ID_HERE';
   const ADMIN_EMAIL = 'your-email@gmail.com';
   ```
4. Run the `setupSheets()` function once (creates all tabs + default admin account)
5. **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployment URL

### 3. Frontend Configuration
1. In `assets/js/app.js`, update:
   ```js
   WEB_APP_URL: 'YOUR_DEPLOYMENT_URL_HERE'
   ```
2. Same URL also needs updating in `login.html` and `users.html`

### 4. GitHub Pages Deployment
1. Push all files to a GitHub repository
2. **Settings → Pages → Deploy from branch → main**
3. Site live at `https://yourusername.github.io/repo-name/`

### 5. First Login
- Default Super Admin: created via `setupSheets()` using `ADMIN_EMAIL`
- Default password: `Admin@123` *(change immediately after first login)*

---

## 🔐 Multi-User System

| Role | Access Level | Can Create Users? |
|---|---|---|
| **Super Admin** | All modules, all data | ✅ Yes |
| **Director** | All modules, all data | ✅ Yes |
| **Manager / Staff** | Only assigned modules | ❌ No |

- Maximum **10 user accounts**
- New users receive credentials via **automated Gmail**
- **Forgot Password** → 6-digit OTP sent via Gmail → 10-minute expiry → password reset
- Every action (create/update/delete/login) logged in **Activity Log** with timestamp, user, and description
- Permissions are module-level checkboxes — Super Admin assigns exactly which pages each user can see

---

## 📜 Business Rules

| Rule | Detail |
|---|---|
| **PL (Paid Leave)** | 12/year, max 1/month, earned-based (no future advance) |
| **SL (Sick Leave)** | 3/year, medical certificate mandatory |
| **LWP** | Salary deducted per absent day |
| **Advance** | Max 50% of salary, deducted same month, no approval required |
| **Loan** | EMI-based, starts next month by default |
| **3-HR Grace** | Senior/tagged staff get 3 hrs of free early-going per month |
| **31-Day Bonus** | Full-month attendance (Stitching/Embroidery + tagged staff) = paid for 31 days |
| **Shifts** | 8–5, 9–6, 10–7, 11–8 |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Hosting | GitHub Pages |
| Backend / API | Google Apps Script |
| Database | Google Sheets |
| Authentication | Custom (Apps Script) + Gmail OTP |
| File Parsing | [SheetJS / XLSX.js](https://sheetjs.com/) |
| Icons | Font Awesome 6.5.1 |
| Fonts | Plus Jakarta Sans, JetBrains Mono |
| Charts | Native Canvas-based charts |

---

## 🗺 Roadmap

### Near-term
- [ ] Dark mode (system-wide toggle)
- [ ] Google Drive integration for Store attachments
- [ ] Live search filtering across all modules
- [ ] Mobile-first responsive audit
- [ ] Profile photo upload

### Mid-term
- [ ] Attendance: manual override, half-day, regularization requests
- [ ] Leave: team calendar view, year-end carry-forward
- [ ] Salary: premium payslip design, bank transfer sheet export
- [ ] Store: stock movement log, low-stock alerts

### Long-term (New Modules)
- [ ] Expense Tracker
- [ ] Visitor Log
- [ ] Task Manager
- [ ] Announcements board
- [ ] MIS Reports generator
- [ ] Performance / Appraisal system
- [ ] Recruitment pipeline

---

## 🚀 Future Technology Upgrades

As the company scales beyond ~500 employees or requires heavier real-time concurrency, here are natural technology evolution paths — **none required immediately**, but documented for future architectural decisions:

### Database Evolution
- **Current:** Google Sheets (great for <2000 rows/sheet, simple queries)
- **Next step:** Firebase Firestore (real-time listeners, better concurrency, still generous free tier)
- **At scale:** PostgreSQL via Supabase (relational integrity, complex joins, row-level security)

### Backend Evolution
- **Current:** Google Apps Script (zero-cost, but rate-limited, 6-min execution cap)
- **Next step:** Cloudflare Workers / Vercel Edge Functions (faster cold starts, generous free tier, no execution time cap)
- **At scale:** Node.js/Express on Railway or Render (full control, websockets for true real-time sync)

### Frontend Evolution
- **Current:** Vanilla JS, multi-page HTML (simple, no build step, easy to debug)
- **Next step:** React or Vue with Vite (component reuse, faster dev velocity once team grows)
- **Consideration:** Only migrate if the team has frontend developers — vanilla JS keeps this maintainable by non-specialists

### Real-Time Sync Evolution
- **Current:** Polling/refresh-based sync via Apps Script
- **Next step:** Firebase Realtime Database or Firestore listeners (true push-based real-time updates, no polling)
- **Enables:** Live "who's editing this record" indicators, instant multi-user collaboration

### File Storage Evolution
- **Current:** Planned Google Drive API integration
- **Next step:** Cloudflare R2 or AWS S3 (cheaper at scale, CDN-backed delivery)

### Authentication Evolution
- **Current:** Custom email/password + Gmail OTP
- **Next step:** Firebase Auth or Clerk (handles edge cases: rate limiting, brute-force protection, session management, social login)

### Mobile Evolution
- **Current:** Responsive web (works in any mobile browser)
- **Next step:** Progressive Web App (PWA) — installable, offline-capable, push notifications
- **Long-term:** React Native app for biometric integration, camera-based attendance, native push notifications

### AI/Automation Evolution
- **Potential additions:**
  - Auto-categorize store items from photos (vision AI)
  - Predictive absenteeism alerts based on patterns
  - Auto-draft late/absent WhatsApp messages with smarter tone matching
  - Resume parsing for the future Recruitment module

> **Philosophy:** Every upgrade above should be driven by an actual pain point (rate limits hit, concurrency issues, team growth) — not adopted prematurely. The current free-tier Google stack can comfortably support a company of this size for years.

---

## 👤 Credits

**Crafted with ❤️ by Aditya Tomar**
HR Professional, House of Panchhi

*Built collaboratively with Claude (Anthropic) — from requirements gathering through full-stack implementation.*

---

<div align="center">

**House of Panchhi HR Software** · v1.0 · 2026

*Zero-cost infrastructure, full-featured HR management.*

</div>
