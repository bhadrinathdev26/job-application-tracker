# Job Application Tracker - Learning Guide & Interview Preparation (`LEARN.md`)

This document is your personal companion guide for understanding the architecture, design choices, and technical concepts behind the Job Application Tracker project. It is updated at every phase so you can explain every part with confidence in full stack developer interviews.

---

## Phase 1: Backend Setup & Foundation

### 1. What We Built and Why

In Phase 1, we set up the backbone of the backend using **Django** and **Django REST Framework (DRF)**.

Key components established:
1. **Directory Structure (`core`, `authentication`, `applications`)**:
   - Instead of putting everything in one giant folder, Django separates concerns into "apps".
   - `core/`: Contains project-wide configuration (routing, database settings, middleware, security).
   - `authentication/`: Dedicated to user registration, login, and JWT token handling.
   - `applications/`: Dedicated to managing job applications, status updates, metrics, and follow-ups.
2. **PyMySQL Shim (`core/__init__.py`)**:
   - `mysqlclient` is a C-extension driver that often fails to compile on Windows without Visual C++ Build Tools installed.
   - `PyMySQL` is a pure-Python MySQL driver.
   - In `core/__init__.py`, we run `pymysql.install_as_MySQLdb()`. This tricks Django into using `PyMySQL` as if it were `mysqlclient`, avoiding Windows installation headaches while keeping full MySQL compatibility.
3. **Environment Variables (`python-dotenv` & `.env`)**:
   - Hardcoding database passwords or Django's `SECRET_KEY` in source code is a major security vulnerability (and red flag in technical interviews).
   - We load secrets dynamically using `dotenv`. We provide a `backend/.env.example` file that shows team members what keys are needed without leaking real secrets.
   - If `SECRET_KEY` is missing, the application halts immediately with a clear error rather than using an insecure fallback.
4. **Explicit Database Switch (`DB_ENGINE`)**:
   - We avoid silent database fallbacks. In `settings.py`, setting `DB_ENGINE=mysql` connects directly to MySQL, while `DB_ENGINE=sqlite` is enabled temporarily for Phase 1 until MySQL is installed on your machine.
5. **CORS Headers (`django-cors-headers`)**:
   - Browsers block web requests made from one domain/port (e.g. React running on `http://localhost:5173`) to another (e.g. Django running on `http://127.0.0.1:8000`) unless the server explicitly sends HTTP headers allowing it.
   - `CorsMiddleware` placed at the top of the middleware stack injects `Access-Control-Allow-Origin` headers into server responses.
6. **Health Check Endpoint (`/api/health/`)**:
   - A lightweight endpoint that returns JSON confirming the server is alive and verifying active database connectivity via `connection.ensure_connection()`.

---

### 2. How the Pieces Connect

```
Incoming HTTP Request (e.g., GET /api/health/)
                  │
                  ▼
          manage.py / wsgi.py
                  │
                  ▼
         core/settings.py (Loads .env, configured middleware)
                  │
                  ▼
      corsheaders.middleware.CorsMiddleware  <── Checks if frontend origin is allowed
                  │
                  ▼
         core/urls.py  <── Matches '/api/health/'
                  │
                  ▼
         health_check view  <── Executes connection.ensure_connection()
                  │
                  ▼
           JSON Response (HTTP 200)
```

---

### 3. Likely Interview Questions & Short Answers

#### Q1: What is the purpose of Django's `SECRET_KEY` and why should it never be committed to Git?
> **Answer:** `SECRET_KEY` is used by Django for cryptographic signing — notably for session cookies, CSRF tokens, and password reset tokens. If an attacker acquires your `SECRET_KEY`, they can forge session tokens and impersonate any user on your platform. That is why it must always be loaded via environment variables and excluded in `.gitignore`.

#### Q2: What is CORS and why did we need `django-cors-headers`?
> **Answer:** CORS stands for Cross-Origin Resource Sharing. By default, web browsers enforce the Same-Origin Policy, which prevents a frontend script on `http://localhost:5173` from accessing an API on `http://127.0.0.1:8000` because the ports differ. `django-cors-headers` adds the appropriate HTTP response headers (like `Access-Control-Allow-Origin`) to tell the browser that requests from our React app are authorized.

#### Q3: Why did we use `PyMySQL` instead of `mysqlclient` on Windows, and what does `install_as_MySQLdb()` do?
> **Answer:** `mysqlclient` requires native C libraries and Microsoft C++ build tools on Windows, which frequently causes installation failures. `PyMySQL` is written entirely in Python, making it cross-platform and reliable. Django's MySQL database backend expects a module named `MySQLdb`. Calling `pymysql.install_as_MySQLdb()` aliases PyMySQL to `MySQLdb` in Python's module cache so Django works with PyMySQL seamlessly.

#### Q4: What is the difference between WSGI and ASGI in Django?
> **Answer:** WSGI (Web Server Gateway Interface) is the synchronous Python standard for web servers like Gunicorn or uWSGI handling HTTP request-response cycles. ASGI (Asynchronous Server Gateway Interface) is the newer standard that supports both synchronous and asynchronous Python code, enabling WebSockets, long polling, and async views (e.g. using Uvicorn or Daphne). In our project, standard REST calls use WSGI, but Django provides both entrypoints (`wsgi.py` and `asgi.py`).
