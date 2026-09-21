# 🎯 CareerTrack - Job Application Tracker (Full Stack)

[![Django](https://img.shields.io/badge/Django-5.1-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.15-red?style=for-the-badge)](https://www.django-rest-framework.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, production-ready, full stack **Job Application Tracker** built to help job seekers organize their career pipeline. Track job applications across customizable stages with an interactive drag-and-drop Kanban board, search and filter in a list view, visualize application velocity with charts, and never miss an outreach with automated follow-up reminders.

---

## 🌟 Live Demo & Preview

- **Live Application:** [https://career-track-demo.vercel.app](https://career-track-demo.vercel.app) *(Replace with your deployed URL)*
- **API Health Check:** `https://career-track-api.onrender.com/api/health/`

*(Screenshots can be added here)*
```text
+-----------------------------------------------------------------------------------+
|  Wishlist (3)    Applied (8)      Interview (2)     Offer (1)       Rejected (4)  |
|  +------------+  +------------+   +------------+    +------------+  +-----------+ |
|  | Google     |  | Stripe     |   | Amazon     |    | Spotify    |  | Uber      | |
|  | SDE I      |  | Full Stack |   | Backend    |    | Frontend   |  | Dev       | |
|  | [Follow-up]|  | $120k-$140k|   | Scheduled  |    | $130k      |  | Archived  | |
|  +------------+  +------------+   +------------+    +------------+  +-----------+ |
+-----------------------------------------------------------------------------------+
```

---

## ✨ Features

- 🔐 **Stateless JWT Authentication:**
  - Secure registration with case-insensitive unique email validation.
  - Token-based login with short-lived Access Tokens (30 min) and long-lived Refresh Tokens (7 days).
  - Axios interceptor that automatically refreshes expired access tokens in the background without interrupting the user.
- 📋 **Multi-Tenant User Isolation:**
  - Enforced in Django ORM querysets (`user=request.user`). Users only ever see and modify their own applications.
  - Cross-user access attempts return `404 Not Found` to eliminate data leakage.
- 🗂️ **Interactive Kanban Board (`@dnd-kit`):**
  - Five stage columns: **Wishlist**, **Applied**, **Interview**, **Offer**, and **Rejected**.
  - Drag and drop cards to change application stages with instant optimistic UI updates and server synchronization.
- 📊 **Table & Stacked List View:**
  - Instant full-text search across company, role, location, and notes.
  - Filter by stage, sort by newest/oldest/company, and server-side pagination.
  - Responsive layout: desktop data table seamlessly switches to touch-friendly cards on mobile screens.
- ⏰ **Smart Follow-up Reminders:**
  - Highlights applications requiring follow-up emails when the scheduled date is reached or overdue.
  - Prominent alert banner on the board and dedicated dashboard section.
- 📈 **Analytics & Velocity Visualizations (`Recharts`):**
  - KPI summary cards (Total Applications, Response Rate %, Active Interviews, Offers).
  - Stage distribution bar charts and 8-week application volume trends.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS (modern, minimal, responsive layout)
- **Routing:** React Router v6 (Public and Protected Route guards)
- **State & Context:** React AuthContext + Axios Interceptors
- **Drag and Drop:** `@dnd-kit/core`
- **Data Visualization:** Recharts
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.12 & Django 5.1
- **REST API:** Django REST Framework (DRF)
- **Authentication:** `djangorestframework-simplejwt` (JSON Web Tokens)
- **Database Engine:** MySQL 8.0 (connected via `PyMySQL` driver with `cryptography`)
- **CORS Handling:** `django-cors-headers`
- **Filtering:** `django-filter`
- **Production Server:** Gunicorn + WhiteNoise (static file serving)

### Architecture Flow
```
[ React Client (Vite) ]
       │  (Axios Interceptor: Bearer <JWT>)
       ▼
[ Nginx / Cloud Host ]
       │
       ▼
[ Gunicorn (WSGI) ] ──> [ Django 5.1 / DRF ]
                              │
                              ├── JWT Middleware (Token Verification)
                              ├── Scoped Querysets (WHERE user_id = request.user.id)
                              │
                              ▼
                      [ MySQL 8.0 Database ]
                      (applications_application, auth_user)
```

---

## 🗄️ Database Schema

### Table: `applications_application`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BigInt | Primary Key, Auto Increment | Unique record identifier |
| `user_id` | Int | Foreign Key (`auth_user.id`), CASCADE | Application owner |
| `company` | VarChar(255) | Not Null | Company name |
| `role` | VarChar(255) | Not Null | Role / job title |
| `status` | VarChar(20) | Not Null, Default: `'wishlist'` | Stage (`wishlist`, `applied`, `interview`, `offer`, `rejected`) |
| `applied_date` | Date | Nullable | Date submitted |
| `job_url` | VarChar(500) | Nullable | Link to job posting |
| `location` | VarChar(255) | Nullable | Work location (e.g. Remote, City) |
| `salary_range` | VarChar(100) | Nullable | Advertised compensation range |
| `notes` | Text | Nullable | Prep notes, interview stages, contacts |
| `follow_up_date` | Date | Nullable | Scheduled follow-up outreach date |
| `created_at` | DateTime | Auto Now Add | Record creation timestamp |
| `updated_at` | DateTime | Auto Now | Last update timestamp |

**Indexes:** Composite indexes on `(user_id, status)`, `(user_id, follow_up_date)`, and `(user_id, created_at)` for high-speed queries.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/`:

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health/` | Public | System & MySQL connection health check |
| `POST` | `/auth/register/` | Public | Register new user (validates email uniqueness) |
| `POST` | `/auth/login/` | Public | Login and obtain access & refresh JWT tokens |
| `POST` | `/auth/refresh/` | Public | Exchange refresh token for fresh access token |
| `GET` | `/auth/me/` | Authenticated | Retrieve authenticated user profile |
| `GET` | `/applications/` | Authenticated | List user's applications (search, filter, sort, paginate) |
| `POST` | `/applications/` | Authenticated | Create a new application |
| `GET` | `/applications/{id}/` | Authenticated | Retrieve specific application details |
| `PUT` | `/applications/{id}/` | Authenticated | Full update of an application |
| `PATCH` | `/applications/{id}/` | Authenticated | Partial update (e.g., status drag-and-drop) |
| `DELETE`| `/applications/{id}/` | Authenticated | Delete an application |
| `GET` | `/applications/stats/` | Authenticated | Aggregated metrics, response rate, weekly volume |
| `GET` | `/applications/follow-ups/`| Authenticated | Overdue and pending follow-up reminders |

---

## 🚀 Local Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+

### 1. Backend Setup
1. Clone repository:
   ```bash
   git clone https://github.com/your-username/job-application-tracker.git
   cd job-application-tracker
   ```

2. Set up Python virtual environment:
   ```bash
   python -m venv backend/venv
   # Windows:
   .\backend\venv\Scripts\activate
   # macOS/Linux:
   source backend/venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Configure `.env`:
   Copy `backend/.env.example` to `backend/.env`:
   ```env
   SECRET_KEY=your-secure-random-secret-key
   DEBUG=True
   ALLOWED_HOSTS=127.0.0.1,localhost
   DB_ENGINE=mysql
   DB_NAME=job_tracker_db
   DB_USER=job_tracker_user
   DB_PASSWORD=your_password
   DB_HOST=127.0.0.1
   DB_PORT=3306
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

5. Apply database migrations:
   ```bash
   python backend/manage.py migrate
   ```

6. Run automated test suite:
   ```bash
   python backend/manage.py test core authentication applications
   ```

7. Start Django development server:
   ```bash
   python backend/manage.py runserver 8000
   ```
   *(Verify at `http://127.0.0.1:8000/api/health/`)*

---

### 2. Frontend Setup
1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Configure `.env`:
   Ensure `frontend/.env` exists:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```

4. Start Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser!

---

## 🌐 Free Deployment Guide

### Option 1: Frontend on Vercel
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select this repository and set **Root Directory** to `frontend`.
4. In **Environment Variables**, set:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api`
5. Click **Deploy**. Vercel uses `vercel.json` to handle client-side routing.

### Option 2: Backend on Render + Free MySQL on Aiven
1. **Free Cloud MySQL:**
   - Create a free account on [Aiven.io](https://aiven.io).
   - Create a free MySQL service and copy the Service URI (`mysql://user:pass@host:port/defaultdb`).
2. **Deploy Backend on Render:**
   - Create a new **Web Service** on [Render](https://render.com) connected to your GitHub repo.
   - Set **Root Directory** to repository root.
   - Build Command: `pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate`
   - Start Command: `gunicorn --chdir backend core.wsgi:application`
   - Environment Variables:
     - `SECRET_KEY`: Generate a 50+ character random string.
     - `DEBUG`: `False`
     - `DB_ENGINE`: `mysql`
     - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: (from Aiven)
     - `ALLOWED_HOSTS`: `your-service.onrender.com`
     - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

---

## 🔮 Future Enhancements
- 🔔 Web Push & Email notifications when a follow-up date arrives.
- 📄 Resume & Cover Letter PDF attachment upload per application (using AWS S3 / Cloudinary).
- 🤖 AI-powered resume matching and tailor-made cover letter generator.
- 📥 Chrome Extension to clip job postings directly from LinkedIn and Indeed.

---

## 📜 License
MIT License. Free for educational and personal use.
