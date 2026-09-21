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

---

## Phase 4: Stats & Follow-Up Reminders Endpoints

### 1. What We Built and Why

In Phase 4, we added analytics intelligence and reminder capabilities to the backend:
1. **Aggregated Stats Endpoint (`GET /api/applications/stats/`)**:
   - Computes overall metrics without transferring thousands of individual records to the client.
   - **`values('status').annotate(count=Count('id'))`**: Leverages MySQL's native `GROUP BY` to aggregate status counts in a single efficient SQL query.
   - **Response Rate Formula:** `(interviews + offers) / (total applied excluding wishlist) * 100`. Tells the candidate the exact conversion efficiency of their applications.
   - **8-Week Application Velocity:** Calculates how many applications were submitted across each of the previous 8 weeks for charting in the UI.
2. **Follow-Up Reminders Endpoint (`GET /api/applications/follow-ups/`)**:
   - Queries `follow_up_date__lte=today` while excluding completed statuses (`offer`, `rejected`).
   - Sorted in ascending order of `follow_up_date` so the most overdue reminders are addressed first.
3. **Automated Unit Tests**:
   - Created test cases in `backend/applications/tests.py` testing math accuracy, zero-division safety, and date-range threshold checks.

---

### 2. How the Aggregation Query Connects

```
Client Dashboard (Stats Page)
          │
          │── GET /api/applications/stats/ ─────────────>
          │   Header: Authorization: Bearer <token>
          │                                            Django Backend (ORM)
          │                                            Executes SQL:
          │                                            SELECT status, COUNT(id)
          │                                            FROM applications_application
          │                                            WHERE user_id = 1
          │                                            GROUP BY status;
          │<─ HTTP 200 OK ─────────────────────────────
          │   { total_applications: 14,
          │     response_rate_percent: 33.3,
          │     status_counts: { applied: 6, interview: 2, ... },
          │     weekly_trend: [...] }
          ▼
Renders Recharts Analytics Visualizations
```

---

### 3. Likely Interview Questions & Short Answers

#### Q1: Why do we perform aggregation in the database rather than fetching all rows into Python memory?
> **Answer:** Scalability and performance. If a user has 10,000 applications, sending 10,000 rows across the network and iterating over them in Python wastes network bandwidth, memory, and CPU. Database engines like MySQL are heavily optimized in C++ to compute `COUNT()` and `GROUP BY` directly on disk/buffer indexes in milliseconds, returning only a tiny summary payload.

#### Q2: How does Django ORM translate `values('status').annotate(count=Count('id'))` into SQL?
> **Answer:** In Django, chaining `.values('status')` before an annotation triggers a SQL `GROUP BY status`. The `.annotate(count=Count('id'))` translates to `SELECT status, COUNT(id) AS count ... GROUP BY status`.

#### Q3: How did you handle edge cases like division by zero when calculating the response rate?
> **Answer:** If a user has only added applications to their "Wishlist" or hasn't submitted any applications yet, `applied_total` would be `0`. A naive calculation `positive / applied_total` would crash with `ZeroDivisionError`. We safeguard this in Python with a ternary condition: `(positive / applied) * 100 if applied > 0 else 0.0`.

#### Q4: What is the purpose of Django's `Q` objects in the weekly velocity calculation?
> **Answer:** By default, `.filter(a=x, b=y)` in Django combines conditions with logical `AND`. `Q` objects allow complex boolean logic including logical `OR` (`|`) and negation (`~`). In our weekly stats, we used `Q(applied_date__gte=start, applied_date__lte=end) | Q(applied_date__isnull=True, created_at__date__gte=start, created_at__date__lte=end)` to gracefully fallback to `created_at` if the user didn't explicitly specify an `applied_date`.

---

## Phase 5: Frontend Architecture & Token Refresh Flow

### 1. What We Built and Why
- **Vite + React 18:** Ultra-fast bundling, ES modules, and rapid hot-module reloading.
- **Tailwind CSS:** Modern utility-first CSS framework allowing rapid, clean UI development without context switching or bloated CSS files.
- **React Router v6:** Declarative client-side routing with `ProtectedRoute` and `PublicRoute` wrappers.
- **Axios Interceptors:**
  - Automatically attaches `Authorization: Bearer <token>` to all API requests.
  - Intercepts `401 Unauthorized` responses, transparently sends `/api/auth/refresh/`, updates the access token in memory/storage, and retries the original request seamlessly.
  - Request queueing prevents multiple simultaneous refresh calls when several parallel API calls trigger a 401.

### 2. Interview Questions & Answers
#### Q1: How does an Axios interceptor refresh expired JWT tokens without disrupting the user?
> **Answer:** An Axios response interceptor intercepts any 401 error. If `_retry` is not set, it marks the request, pauses other requests in a queue, and posts the long-lived refresh token to `/api/auth/refresh/`. Upon receiving a fresh access token, it updates `localStorage`, rewrites the request's `Authorization` header, resolves the queued promises, and retries the failed request. To the user, the app works without ever logging out.

#### Q2: What is the difference between client-side routing (React Router) and traditional server-side routing?
> **Answer:** In traditional server-side routing, clicking a link requests a full HTML document from the server, causing a page refresh. In client-side routing (SPA), the browser downloads one initial bundle. React Router listens to URL changes via the HTML5 History API and swaps the active view components in DOM memory instantaneously without contacting the server.

---

## Phase 6: Kanban Drag-and-Drop & Table Views

### 1. What We Built and Why
- **`@dnd-kit/core` Drag-and-Drop:** Modern, accessible, mobile-touch friendly drag-and-drop library.
- **Optimistic UI Updates:** When a card is dragged from "Applied" to "Interview", the state updates in React immediately so the user feels zero lag. The `PATCH /api/applications/{id}/` request is sent in the background. If the network call fails, React reverts to the previous snapshot and displays an alert.
- **Table List View with Stacked Mobile Cards:** A responsive table for desktops that collapses into clean vertical cards on mobile devices.

### 2. Interview Questions & Answers
#### Q1: What is an "Optimistic UI Update" and why is it used in Kanban boards?
> **Answer:** An optimistic update modifies the user interface before receiving confirmation from the server, assuming the network request will succeed. For drag-and-drop interactions, waiting for a 200ms round-trip makes the UI feel sluggish. If the server request fails, the application rolls back the change and displays an error notification.

---

## Phase 7: Analytics Visualization & Reminders

### 1. What We Built and Why
- **Recharts Data Visualization:** Composable SVG charts rendered natively within React's component tree.
- **KPI Summary Cards:** Quick bird's-eye metrics (Total, Active, Response Rate %, Offers).
- **Follow-up Reminders:** Filters applications where `follow_up_date <= today` and status is active, helping candidates never miss a thank-you note or check-in.

### 2. Interview Questions & Answers
#### Q1: How do you format backend datetime data for Recharts?
> **Answer:** Recharts expects an array of clean JavaScript objects (e.g. `[{ week: "Wk Sep 15", count: 4 }]`). We structure our Django endpoint to return clean serialized primitives so the React frontend can bind keys directly to `<XAxis dataKey="week" />` and `<Bar dataKey="count" />`.

---

## Phase 8: Mobile Polish & Edge-Case Handling

### 1. What We Built and Why
- Horizontal touch scrolling on Kanban boards (`overflow-x-auto`) with minimum column widths.
- PointerSensor activation constraints (`distance: 5px`) so tapping cards doesn't accidentally trigger drag mode.
- Empty states with call-to-action buttons ("No applications yet - Add your first one").

---

## Phase 9: Cloud Deployment & DevOps

### 1. What We Built and Why
- **WhiteNoise:** Serves static files directly from Gunicorn with gzip/brotli compression and cache-busting hashes, eliminating the need for complex web server configurations.
- **Gunicorn:** A battle-tested WSGI HTTP server for UNIX/Linux hosting (Render, Railway).
- **SPA Rewrite Rules (`vercel.json` / `_redirects`):** Rewrites all incoming paths (`/*`) to `/index.html` so client-side routing works on page refreshes.

### 2. Interview Questions & Answers
#### Q1: Why do single-page applications (SPAs) return 404 when refreshed on cloud hosts unless rewrite rules are added?
> **Answer:** In an SPA, routes like `/applications` or `/stats` do not exist as physical HTML files on the server's disk. When a user refreshes the page, the cloud host looks for `/applications/index.html` and returns 404. Adding a rewrite rule (`/* -> /index.html`) instructs the web server to always serve the root `index.html`, allowing React Router to inspect the URL in the browser and render the correct view.

---

## Phase 10: Technical Interview Mastery - High-Yield Question Bank

### Section A: Python & Django Architecture
1. **Explain Django's MVT (Model-View-Template) pattern.**
   - *Answer:* Model represents database tables and logic; View (or ViewSet in DRF) handles HTTP requests, business logic, and queries; Template (or Serializer in DRF) formats data for display (HTML or JSON).
2. **What is Django ORM and what are its advantages?**
   - *Answer:* Object-Relational Mapping allows developers to interact with relational databases using Python classes instead of writing raw SQL. It protects against SQL injection, provides database engine agnosticism, and tracks schema changes via migrations.
3. **What is the N+1 query problem and how do you prevent it in Django?**
   - *Answer:* The N+1 problem occurs when querying a table of N records causes N additional queries to fetch foreign key relationships. In Django, we prevent this using `select_related()` (for `ForeignKey` and `OneToOne` via SQL `JOIN`) or `prefetch_related()` (for `ManyToMany` and reverse foreign keys).

### Section B: REST APIs & Authentication
4. **What are the principles of RESTful APIs?**
   - *Answer:* Statelessness, client-server decoupling, uniform interface (HTTP methods like GET, POST, PUT, PATCH, DELETE), resource-based URIs, and standard HTTP status codes.
5. **How does Password Hashing work in Django?**
   - *Answer:* Django never stores passwords in plain text. It uses the PBKDF2 algorithm with a SHA-256 hash and a unique cryptographic salt per user. Even if the database is leaked, rainbow table attacks are ineffective.

### Section C: React & Frontend Performance
6. **What is the Virtual DOM and how does React use it?**
   - *Answer:* The Virtual DOM is a lightweight JavaScript representation of the real DOM. When state changes, React creates a new virtual DOM tree, diffs it against the previous one (reconciliation), and updates only the modified real DOM nodes.
7. **What is the purpose of React's `useEffect` cleanup function?**
   - *Answer:* It cancels active subscriptions, clears intervals/timers, or aborts pending fetch requests when a component unmounts or before re-running the effect, preventing memory leaks.
