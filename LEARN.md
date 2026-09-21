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

---

## Phase 3: Applications Core API (CRUD & Multi-Tenant Data Isolation)

### 1. What We Built and Why

In Phase 3, we built the core data engine of the Job Application Tracker: the `Application` model, serializers, filters, and a `ModelViewSet` with complete CRUD capabilities.

Key components established:
1. **Relational Model (`backend/applications/models.py`)**:
   - `user`: Foreign key to `auth.User` with `on_delete=models.CASCADE`. If an account is deleted, all their applications are automatically and cleanly removed from the database.
   - `status`: Utilizes Django's `models.TextChoices` (`WISHLIST`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`), providing readable database values while giving Python type safety and automatic choice validation.
   - `indexes`: Created composite database indexes (`user + status`, `user + follow_up_date`, `user + created_at`) on MySQL, optimizing lookups so queries remain lightning-fast even with tens of thousands of records.
2. **Strict Multi-Tenant User Isolation (`ApplicationViewSet.get_queryset()`)**:
   - Security rule: A user should **never** be able to see or manipulate another user's applications.
   - Instead of checking user permissions manually in every view method, we override `get_queryset()` to return `Application.objects.filter(user=self.request.user)`.
   - If User A attempts to access, edit, or delete User B's application (`/api/applications/{id}/`), Django queries User A's scoped queryset, finds nothing, and automatically responds with `HTTP 404 Not Found`. This prevents information leakage (an attacker cannot even tell whether an application ID exists for someone else).
3. **Automatic Owner Binding (`perform_create`)**:
   - The frontend does not pass a `user` field when creating an application. In `perform_create()`, Django automatically binds the authenticated user (`serializer.save(user=self.request.user)`). This prevents spoofing.
4. **Filtering, Searching & Pagination**:
   - **Search (`SearchFilter`):** Full-text case-insensitive search across `company`, `role`, `location`, and `notes`.
   - **Filter (`DjangoFilterBackend` + `ApplicationFilter`):** Exact and case-insensitive filtering by `status`, `company`, `role`, `location`, and date ranges (`applied_after`, `applied_before`).
   - **Ordering (`OrderingFilter`):** Sorting by `applied_date`, `created_at`, `company`, or `status`.
   - **Pagination:** Paginates results by 10 items per page with `count`, `next`, and `previous` links.

---

### 2. How the Query Isolation and CRUD Flow Connect

```
HTTP Request: PATCH /api/applications/42/ { "status": "interview" }
Headers: Authorization: Bearer <access_token>
                      │
                      ▼
         JWTAuthentication Middleware
  (Validates token signature -> binds user to request.user)
                      │
                      ▼
         ApplicationViewSet.get_queryset()
  Executes: SELECT * FROM applications_application
            WHERE id = 42 AND user_id = request.user.id;
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
Record found?                 Record not found (or belongs to other user)?
  │                                         │
  ▼                                         ▼
ApplicationSerializer.is_valid()    Return HTTP 404 Not Found
  │                                 (Zero data leakage)
  ▼
Updates DB & returns HTTP 200
```

---

### 3. Likely Interview Questions & Short Answers

#### Q1: How do you enforce multi-tenant data isolation in Django REST Framework?
> **Answer:** By overriding `get_queryset()` in the ViewSet to filter records by `self.request.user`:
> ```python
> def get_queryset(self):
>     return Application.objects.filter(user=self.request.user)
> ```
> This ensures that all list, retrieve, update, and delete actions automatically operate only within the logged-in user's private dataset. If someone attempts to access another user's ID, DRF raises an `Http404` error.

#### Q2: Why is returning 404 better than 403 when a user tries to access another user's record?
> **Answer:** Returning `403 Forbidden` confirms to an attacker that the resource ID actually exists in the database. Returning `404 Not Found` completely hides the existence of the resource, preventing ID enumeration attacks and data harvesting.

#### Q3: What is the difference between `PUT` and `PATCH` in RESTful APIs, and how does that apply to our Kanban board?
> **Answer:**
> - `PUT`: Replaces the entire resource. All required fields must be supplied in the request body.
> - `PATCH`: Partially updates specific fields without modifying the others.
> When dragging a card across columns on a Kanban board, we only need to change `status`. A `PATCH` request with `{ "status": "interview" }` is ideal because it avoids resending the entire application payload over the network.

#### Q4: Why use `models.TextChoices` in Django instead of raw string tuples?
> **Answer:** `models.TextChoices` provides a clean, enum-like class in Python. It centralizes all valid choices, prevents typo bugs (e.g. using `ApplicationStatus.INTERVIEW` instead of hardcoding `'interview'`), and generates human-friendly labels accessible via `get_status_display()`.

#### Q5: What are database indexes and why did we add composite indexes on `(user, status)`?
> **Answer:** An index is a data structure (typically a B-Tree) that allows the database engine to locate records without scanning every row in a table. Because our application constantly queries `WHERE user_id = ? AND status = ?` to populate the Kanban board columns, a composite index on `(user, status)` lets MySQL jump directly to the user's stage-specific applications in $O(\log n)$ time.
