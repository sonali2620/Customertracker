# ResolveIQ — Intelligent Customer Complaint & Service Management System

ResolveIQ is a full-stack, enterprise-grade customer complaint and service resolution platform designed to manage customer tickets from initial submission to final resolution, featuring SLA tracking, automated agent routing, and intelligent analytics.

---

## 1. System Architecture & Tech Stack

```
                          ┌───────────────────────────┐
                          │   React.js 18 + Vite UI   │
                          │   Tailwind CSS + Recharts │
                          └─────────────┬─────────────┘
                                        │ HTTP / REST / JSON
                                        ▼
                          ┌───────────────────────────┐
                          │    Express.js Backend     │
                          │   JWT / Cookies / Helmet  │
                          └──────┬─────────────┬──────┘
                                 │             │
                ┌────────────────┴───┐     ┌───┴────────────────┐
                │   Prisma ORM (v5)  │     │ SLA Dispatch Cron  │
                └────────┬───────────┘     └────────────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │     MongoDB DB     │
                │  (Port 27018/27017)│
                └────────────────────┘
```

### Technology Stack
- **Frontend**: React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Lucide React, Recharts, React Hook Form.
- **Backend**: Node.js, Express.js, REST API (`/api/v1`), JWT authentication (HTTP-only cookies + Bearer token), bcryptjs, Helmet, CORS, Express Rate Limit, Multer.
- **Database & ORM**: MongoDB, Prisma ORM (v5.22.0) with NoSQL document models, ObjectIds, and compound indexes.
- **Testing**: Vitest + React Testing Library (frontend), Vitest + Supertest (backend API).

---

## 2. Demo User Credentials

The database is pre-seeded with 22 realistic customer complaints across technical outages, billing disputes, account access, and security compliance. 

| Role | Name | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Manager / Admin** | Alexander Sterling | `manager@resolveiq.com` | `Manager@123` | Full system access, team workload, manual reassignment, SLA policy config, user management, audit history |
| **Support Agent** | Sarah Jenkins | `agent.sarah@resolveiq.com` | `Agent@123` | Assigned complaints queue, investigation notes, public replies, status transitions, Copilot AI drafts |
| **Customer** | John Miller | `customer.john@example.com` | `Customer@123` | Submit complaints, view personal tickets only, public comments, confirm resolution, reopen with reason, 5-star CSAT ratings |

> **Note on 1-Click Login:** On the login page, you can click any of the **1-Click Demo Login** buttons (**Manager**, **Agent**, or **Customer**) for instant access without typing credentials.

---

## 3. Getting Started & Installation

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: MongoDB installed locally (or MongoDB Atlas cluster URI)

### 1. Configure Environment
Copy the environment template in the project root:
```bash
cp .env.example .env
cp server/.env.example server/.env   # or configure server/.env directly
```

Default MongoDB configuration (`server/.env`):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mongodb://127.0.0.1:27018/resolveiq_db?replicaSet=rs0&directConnection=true"
JWT_SECRET="resolveiq_super_secret_jwt_key_2026_dev_mode"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
SLA_CHECK_INTERVAL_MS=60000
```
*(Or point `DATABASE_URL` to your MongoDB Atlas cluster or default local port `27017`)*

### 2. Start Local MongoDB Replica Set (If not running MongoDB Atlas)
```bash
npm run mongo:start
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Initialize Database & Seed Demo Data
```bash
# Push schema & collections to MongoDB
npm run db:migrate

# Seed demo users, categories, SLA policies, and 22 tickets
npm run db:seed
```

### 4. Run Both Frontend & Backend Concurrently
```bash
npm run dev
```

The application will be accessible at:
- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 4. Running Automated Tests

Run the complete test suite (both backend API and frontend component tests):
```bash
npm test
```

Or run individually:
```bash
# Backend Supertest + Vitest suite (11 tests)
npm run test:server

# Frontend Testing Library + Vitest suite (4 tests)
npm run test:client
```

---

## 5. Core Business Logic & Architecture

### 1. Unique Ticket Generation
Each complaint is assigned a human-readable, sequence-padded ticket identifier:
- Format: `RIQ-YYYY-NNNNN` (e.g. `RIQ-2026-00001`, `RIQ-2026-00002`).

### 2. Deterministic Priority Engine
Calculates suggested priority (LOW, MEDIUM, HIGH, CRITICAL) using a deterministic multi-factor scoring formula:
- **Impact (Max 40 pts)**: Critical (+40), High (+28), Moderate (+16), Low (+6).
- **Urgency (Max 30 pts)**: Immediate (+30), High (+20), Normal (+12), Flexible (+4).
- **Affected User Scope (Max 20 pts)**: >100 (+20), 25–100 (+15), 5–25 (+10), 1–5 (+5).
- **Category Domain (Max 10 pts)**: Outage/Security (+10), Billing/Access (+6), Other (+2).
- **Thresholds**: $\ge 75 \to \text{CRITICAL}$, $\ge 55 \to \text{HIGH}$, $\ge 32 \to \text{MEDIUM}$, $< 32 \to \text{LOW}$.

### 3. Fair Automatic Agent Assignment
Deterministically selects the most eligible support specialist:
1. Filters active agents matching the complaint's category skills.
2. Calculates open workload counts (excluding resolved/closed tickets).
3. Selects the agent with the lowest active workload below their capacity limit.
4. Uses deterministic tie-breaking (alphabetical agent ID).
5. If no agent has capacity, leaves ticket unassigned and alerts managers.

### 4. SLA Monitoring & Idempotent Escalation
- **Deadlines**: Tracks First-Response and Resolution targets in UTC.
  - Critical: 15m response, 4h resolution
  - High: 1h response, 12h resolution
  - Medium: 4h response, 48h resolution
  - Low: 8h response, 72h resolution
- **Idempotent Background Dispatcher**: Periodic job scans overdue tickets, logs escalation records without duplicates, and alerts managers/agents.

### 5. Controlled State Machine
Valid transitions are strictly enforced on the server:
- `OPEN` $\to$ `ASSIGNED`, `IN_PROGRESS`, `CLOSED`
- `ASSIGNED` $\to$ `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `OPEN`
- `IN_PROGRESS` $\to$ `WAITING_FOR_CUSTOMER`, `RESOLVED`, `ASSIGNED`
- `WAITING_FOR_CUSTOMER` $\to$ `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- `RESOLVED` $\to$ `CLOSED` (Customer verification), `REOPENED` (Requires explicit reason)
- `CLOSED` $\to$ `REOPENED` (Requires explicit reason)
- `REOPENED` $\to$ `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`

### 6. Customer Privacy & Internal Notes
- **Customer View Isolation**: Customer API responses strictly omit `isInternal: true` notes.
- **IDOR Protection**: Customers can only view and interact with their own registered tickets.
- **Staff Collaboration**: Support agents and managers can add private investigation notes visible only to staff.

### 7. Advisory AI Copilot
- Provides advisory thread summarization, classification suggestions, and polite customer responses.
- Operates with an intelligent, deterministic NLP fallback when no external API key is configured.

---

## 6. REST API Reference (`/api/v1`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate and issue JWT cookie/token | Public |
| `POST` | `/auth/register` | Register customer account | Public |
| `POST` | `/auth/logout` | Clear auth cookies | Authenticated |
| `GET` | `/auth/me` | Fetch active user profile | Authenticated |
| `POST` | `/auth/change-password` | Update account password | Authenticated |
| `GET` | `/complaints` | Paginated ticket list with filters & sorting | Role Scoped |
| `POST` | `/complaints` | Register a new complaint | Authenticated |
| `GET` | `/complaints/:id` | Full complaint details with audit timeline | Scoped (Owner/Staff) |
| `PUT` | `/complaints/:id` | Update permitted ticket fields | Scoped |
| `PATCH` | `/complaints/:id/status` | Execute state machine status transition | Role Enforced |
| `PATCH` | `/complaints/:id/assign` | Assign/reassign agent | Manager / Agent |
| `GET` | `/complaints/:id/comments` | Fetch public comments and internal notes | Scoped (Notes hidden from Customer) |
| `POST` | `/complaints/:id/comments` | Post public reply or internal staff note | Scoped |
| `POST` | `/complaints/:id/feedback` | Submit 1–5 star CSAT rating & feedback | Customer |
| `GET` | `/sla/policies` | List all SLA policies | Authenticated |
| `PUT` | `/sla/policies/:priority` | Update priority SLA targets | Manager |
| `POST` | `/sla/check` | Trigger manual SLA escalation verification | Staff |
| `GET` | `/sla/escalations` | List escalation history audit log | Staff |
| `GET` | `/analytics/dashboard` | KPI metrics, Recharts trends, CSAT score | Scoped |
| `GET` | `/analytics/export-csv` | Stream filtered tickets as downloadable CSV | Scoped |
| `GET` | `/users` | List system users | Manager |
| `POST` | `/users` | Create user account | Manager |
| `GET` | `/users/agents` | List agents with real-time workloads | Staff |
| `GET` | `/users/categories` | List active complaint categories | Authenticated |
| `GET` | `/notifications` | List user in-app notifications | Authenticated |
| `PATCH` | `/notifications/:id/read`| Mark notification as read | Authenticated |
| `PATCH` | `/notifications/read-all`| Mark all notifications as read | Authenticated |
| `POST` | `/ai/classify` | AI/NLP suggestion for category & priority | Authenticated |
| `GET` | `/ai/summarize/:id` | AI advisory summary of complaint thread | Staff |
| `POST` | `/ai/draft-response/:id` | AI draft polite customer response | Staff |

---

## 7. Suggested Interviewer Demonstration Workflow

1. **Sign In as Manager**
   - Click **Manager** under **1-Click Demo Login** on [http://localhost:5173/login](http://localhost:5173/login).
   - Review executive KPI cards, inflow trend area charts, and team workload gauges on the Dashboard.
2. **Inspect SLA & Escalations**
   - Click **SLA & Escalations** in the sidebar.
   - Observe overdue tickets (`RIQ-2026-00001` - Production Outage).
   - Click **Run SLA Escalation Scan** to demonstrate idempotent background checks.
3. **Register a New Complaint**
   - Click **Create Complaint**.
   - Type title: *"Critical Payment Failure on Checkout"*.
   - Click **AI Auto-Classify** to observe the NLP classifier suggest Billing category and Critical priority.
   - Notice the real-time **Priority Engine Preview** composite score update dynamically.
   - Click **Register Complaint** to see atomic generation of a unique ticket ID (e.g. `RIQ-2026-00023`).
4. **Staff Investigation & AI Copilot**
   - Open ticket details.
   - View SLA countdown timer and customer metadata.
   - In the **ResolveIQ Copilot** box, click **Draft Response** $\to$ choose **Acknowledgement** $\to$ click **Insert into Reply Box**.
   - Post an **Internal Staff Note** by checking *"Mark as Internal Note"*.
5. **Customer Resolution & CSAT Feedback**
   - Log out, then 1-click log in as **Customer (John Miller)**.
   - Open ticket `RIQ-2026-00004` (Resolved).
   - Confirm that the internal staff notes are **completely hidden** from customer view.
   - Click **Confirm Resolution** or submit a **5-Star CSAT Rating**.
