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

---

## Phase 2: Authentication (JWT & User Isolation Foundation)

### 1. What We Built and Why

In Phase 2, we built a complete authentication system using **JSON Web Tokens (JWT)** via `djangorestframework-simplejwt` and Django's built-in `User` model.

Key components established:
1. **User Registration (`POST /api/auth/register/`)**:
   - Accepts `username`, `email`, and `password`.
   - **Email Uniqueness:** The built-in Django User model allows duplicate emails by default. Our `RegisterSerializer` explicitly overrides `validate_email` to enforce case-insensitive uniqueness across the entire system.
   - **Password Security:** Validates passwords against Django's configured password validators (`MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`) and securely hashes passwords using PBKDF2 with SHA-256 via `User.objects.create_user()`.
   - Returns user details plus an initial pair of JWT tokens (`access` and `refresh`) to allow instant auto-login right after registration.
2. **User Login (`POST /api/auth/login/`)**:
   - Accepts credentials (`username` and `password`).
   - Implemented `CustomTokenObtainPairSerializer` which returns standard JWT tokens plus user metadata (`id`, `username`, `email`), allowing the frontend to immediately initialize user state without an extra network request.
3. **Token Refresh (`POST /api/auth/refresh/`)**:
   - Takes a valid `refresh` token and generates a fresh `access` token when the previous one expires.
4. **Current User Profile (`GET /api/auth/me/`)**:
   - A protected endpoint requiring `Authorization: Bearer <access_token>`.
   - Returns the authenticated user's ID, username, email, and date joined. Unauthenticated requests receive HTTP 401 Unauthorized.

---

### 2. How the Authentication Pieces Connect

```
1. REGISTRATION / LOGIN FLOW:
Client (React / Postman)                     Django Backend
        │                                           │
        │── POST /api/auth/login/ ─────────────────>│
        │   { username, password }                  │
        │                                           │ Validates credentials against DB
        │                                           │ Signs Access (30m) & Refresh (7d) tokens
        │<─ HTTP 200 OK ────────────────────────────│
        │   { access, refresh, user }               │
        ▼                                           ▼
Stores tokens in client memory/storage

2. PROTECTED API REQUEST FLOW:
Client (React / Postman)                     Django Backend
        │                                           │
        │── GET /api/auth/me/ ─────────────────────>│
        │   Header: Authorization: Bearer <access>  │
        │                                           │ 1. SimpleJWT middleware checks signature
        │                                           │ 2. Extracts `user_id` from token payload
        │                                           │ 3. Fetches user from DB -> assigns `request.user`
        │                                           │ 4. View executes: returns UserSerializer(request.user)
        │<─ HTTP 200 OK ────────────────────────────│
        │   { id, username, email, date_joined }    │
```

---

### 3. Likely Interview Questions & Short Answers

#### Q1: What is a JSON Web Token (JWT) and what are its three parts?
> **Answer:** A JWT is a compact, URL-safe token format used for stateless authentication. It consists of three parts separated by dots (`.`):
> 1. **Header:** Identifies the algorithm (e.g., HMAC SHA-256 / HS256) and token type.
> 2. **Payload (Claims):** Contains the claims/data, such as `user_id`, `token_type`, and expiration timestamp (`exp`).
> 3. **Signature:** Created by hashing the encoded header, encoded payload, and a secret key (`SECRET_KEY`). The signature guarantees that the payload has not been tampered with.

#### Q2: Why do we use separate Access and Refresh tokens instead of a single long-lived token?
> **Answer:** Security and usability trade-off:
> - **Access Token:** Has a short lifetime (e.g. 15–30 minutes) and is sent with every API request. Because it travels frequently over the network, if it is intercepted, the attacker's window of opportunity is very narrow.
> - **Refresh Token:** Has a longer lifetime (e.g. 7 days) and is stored securely, only sent to `/api/auth/refresh/` to obtain a new access token. If a user logs out or is banned, the refresh token can be blacklisted.

#### Q3: How is JWT authentication "stateless" compared to traditional session authentication?
> **Answer:** In traditional Django session authentication, the server creates a session ID, stores it in the database/cache (`django_session`), and sends a cookie to the client. On every request, the server must look up the session in the database. With JWTs, the server verifies the cryptographic signature directly using `SECRET_KEY` without querying a session table. This makes JWTs easily scalable across distributed microservices or serverless functions.

#### Q4: Why did we enforce email uniqueness in the serializer instead of relying on Django's default User model?
> **Answer:** In Django's default `django.contrib.auth.models.User`, only the `username` field has a `unique=True` database constraint; `email` is optional and non-unique. For modern applications where email is often used for identity and communication, duplicate emails cause account confusion and security risks. We enforced case-insensitive email uniqueness in the `RegisterSerializer.validate_email` method to guarantee one account per email.

#### Q5: What does the HTTP 401 Unauthorized status mean versus HTTP 403 Forbidden?
> **Answer:**
> - **401 Unauthorized:** The client is unauthenticated — no credentials were provided or the token is invalid/expired ("Who are you? Please log in").
> - **403 Forbidden:** The client is authenticated, but does not have permission to perform that action or view that resource ("I know who you are, but you cannot touch this").
