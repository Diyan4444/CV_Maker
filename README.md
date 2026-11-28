# Quillfolio

Quillfolio is an intelligent career-profile platform that understands the individual before generating their professional identity across ATS-optimized PDF resumes and academic CVs.

## Getting Started

### Prerequisites
- Node.js `>=22.13.0` (LTS)
- npm `>=10.0.0`

> **Platform Development Note (Windows / Linux / macOS)**:
> Node dependencies and binaries (such as Turbopack, SWC, and native bindings) are platform-specific. Always **run `npm ci` on the platform you develop on**. If switching between Windows and WSL/Linux, re-run `npm ci` on that specific operating environment.

### Environment Configuration

Quillfolio strictly partitions environment variables between client-side bundles and server-side runtime secrets.

#### Local Development (`.env.local`)
Copy `.env.example` to `.env.local` and configure the following variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase Transaction Pooler, port 6543)
- `MIGRATION_DATABASE_URL` (Supabase Direct / Session Connection, port 5432 - for `npm run db:apply`)
- `NEXT_PUBLIC_APP_URL` (optional, defaults to request origin)
- `PRIMARY_ADMIN_EMAIL` (optional, protected developer account during user cleanups)

#### Vercel Production Deployment (Vercel Project Settings)
In the Vercel Project Dashboard (`Settings -> Environment Variables`), configure ONLY these runtime variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase Transaction Pooler, port 6543)
- `NEXT_PUBLIC_APP_URL` (your production custom domain, e.g. `https://quillfolio.com`)

*(Note: `MIGRATION_DATABASE_URL` must **NOT** be set in Vercel runtime. Database migrations are applied from your local workstation or CI pipeline before deployment, never during serverless HTTP execution).*

---

### Database Architecture & Migrations (`npm run db:apply`)

Quillfolio employs an atomic, checksum-verified migration runner in `scripts/apply-migrations.ts`. Migrations in `supabase/migrations/*.sql` execute in strict numeric order within dedicated transactions:

1. `0001_core_schema.sql` (Tables, Foreign Keys, Unique Constraints, Role Grants)
2. `0002_rls_policies_only.sql` (Row-Level Security Policies & Auth Trigger)
3. `0004_db_constraints.sql` (Regex & Length Checks)
4. `0005_version_and_caps.sql` (Optimistic Concurrency Versions & Per-User Row Caps)
5. `0006_missing_caps.sql` (Row Caps for Certifications, Publications, Achievements, Custom Sections)
6. `0007_indexes.sql` (Performance Indexes, Search Paths, and Anon/Authenticated Privilege Hardening)
7. `0008_drop_duplicate_indexes.sql` (Drop Redundant Duplicate Indexes Covered by Unique Constraints)
8. `0009_profiles_auth_cascade.sql` (Cascade Deletion from auth.users to profiles)
9. `0010_remove_public_side.sql` (Drop websites table, reserved-username trigger/function — apply AFTER deploying code that no longer uses `websites`)

### Production Release Order
1. **Additive migrations BEFORE deploy**: Apply additive schema changes (such as `0011_document_status.sql` or any later `ADD COLUMN` / `CREATE TABLE` migration) to production *before* deploying application code that reads/writes the new schema:
   ```bash
   npm run db:apply -- --confirm-ref <prod-ref>
   npm run db:verify
   ```
   *(If you are releasing `0010_remove_public_side.sql` + `0011_document_status.sql` together from an older baseline, apply additive `0011` first or ensure zero running code still queries `public.websites` before running `0010`.)*
2. **Deploy application code**: Deploy the new build to Vercel once additive migrations are live.
3. **Drop migrations AFTER deploy**: Only *after* the new application code is live and no old deployment is serving traffic, apply destructive drop migrations (such as `0010_remove_public_side.sql` dropping `public.websites` and reserved-username triggers/functions, or any later `DROP` migration).
4. **Post-deploy verify**: Run `npm run check:legal` and `npm run db:verify` against the target environment.

### Account Export Format (`exportVersion: "3"`)
- `/api/account/export` outputs `exportVersion: "3"`, adding `documents[].status` (`"draft"` or `"ready"`) following migration `0011_document_status.sql`. (`exportVersion: "2"` removed the legacy `website` key).

#### How to Deploy to an Empty Supabase Project:
1. Create a new Supabase project in the Supabase Dashboard.
2. In Supabase Dashboard, navigate to **Project Settings -> Database -> Connection string**.
3. Copy the **Direct / Session connection URI (port 5432)**.
4. Set `MIGRATION_DATABASE_URL` in your terminal or `.env.local`:
   ```bash
   # Windows PowerShell:
   $env:MIGRATION_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   npm run db:apply
   ```
5. All tables, constraints, functions, triggers, and RLS policies will be created from scratch.
6. Copy the **Transaction Pooler URI (port 6543)** and set it as `DATABASE_URL` in Vercel.

---

## Production Deployment Checklist

Follow these exact steps in order when setting up and deploying Quillfolio to a new production environment:

### Step 1: Create an Empty Supabase Production Project
1. Log in to the Supabase Dashboard and create a new project (e.g. `quillfolio-prod`).
2. Navigate to **Project Settings -> Database -> Connection string**.
3. Note your project reference (`<prod-ref>`) and connection strings:
   - **Direct / Session Connection (port 5432)**: `postgresql://postgres.[prod-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres` (or `db.[prod-ref].supabase.co:5432`).
   - **Transaction Pooler Connection (port 6543)**: `postgresql://postgres.[prod-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`.

### Step 2: Validate Migration Connection with Dry Run
Run a dry run from your local workstation using the Direct connection string (port 5432) to verify URL syntax, port validation, and project reference extraction:
```bash
# Windows PowerShell:
$env:MIGRATION_DATABASE_URL="postgresql://postgres.[prod-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
npm run db:apply -- --dry-run
```
Expected output:
- Identifies `MIGRATION_DATABASE_URL` as source.
- Reports Host, Port `5432`, and Project Ref `<prod-ref>`.
- Lists all 7 migrations with status `[unknown] (dry run)`.
- Exits code 0 with `Dry run complete. No connection was made to the database.`

### Step 3: Apply Full Database Schema with Explicit Reference Confirmation
Execute the atomic schema apply targeting the production database:
```bash
npm run db:apply -- --confirm-ref <prod-ref>
```
Expected output:
- Matches confirmation flag `--confirm-ref <prod-ref>`.
- Connects over session connection (port 5432) with SSL.
- Acquires advisory lock (`0x5175696c6c666f`).
- Applies migrations `0001` through `0008` sequentially in isolated transactions.
- Records checksums in `app_migrations` table.
- Exits code 0 with `All pending migrations applied successfully.`

### Step 4: Run Read-Only Schema Verification (`npm run db:verify`)
Verify database structure, permissions, and security posture using the read-only verification suite:
```bash
npm run db:verify
```
Expected output:
- Starts read-only transaction (`SET TRANSACTION READ ONLY`).
- Audits and verifies:
  - All 14 public tables exist (derived dynamically from `src/lib/db/schema.ts` + `app_migrations`): `achievements`, `ai_usage_logs`, `app_migrations`, `certifications`, `custom_sections`, `document_sections`, `documents`, `education`, `experiences`, `master_profiles`, `profiles`, `projects`, `publications`, `skills`.
  - Row Level Security (RLS) is enabled on all tables.
  - Anon role has zero table privileges (15/15 completely inaccessible).
  - Authenticated role is strictly restricted to CRUD operations (and SELECT-only on `ai_usage_logs`).
  - Auth trigger `on_auth_user_created` is registered on `auth.users`.
  - Security definer functions (`handle_new_user`) declare explicit `search_path = public`.
  - All migrations (`0001` - `0008`) are recorded and verified.
- Exits code 0 with `All verification checks passed cleanly!`

### Step 5: Configure Production Environment Variables in Vercel
In Vercel Dashboard -> **Project Settings -> Environment Variables**, configure the following variables for the Production environment:
- `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://<prod-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Anon public key)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Service Role secret key)
- `DATABASE_URL` (Supabase Transaction Pooler URI on port **6543**, e.g. `postgresql://postgres.<prod-ref>:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`)
- `NEXT_PUBLIC_APP_URL` (*Optional*: Production custom domain, e.g. `https://quillfolio.com`; if omitted, the app dynamically uses the incoming request origin for auth redirects)

> **IMPORTANT RULE: Environment Separation & Safety Guard**:
> - Never set `MIGRATION_DATABASE_URL` in Vercel runtime.
> - Never run automated tests or test scripts (`npm test`, `npm run test:integration`, `npx playwright test`, `scripts/list-and-clean-users.ts`) with production credentials or against the production database.
> - Test suites and cleanup scripts enforce a strict `.test-projects` allowlist guard. Any attempt to run them against a database whose project reference is not in `.test-projects` will throw a fatal error and terminate immediately.

### Step 6: Deploy to Vercel
Trigger deployment via Vercel Git integration (`git push origin main` after confirmation) or Vercel CLI (`vercel --prod`).

### Step 7: Landing Page Specimens Regeneration
The landing page displays real rendered specimen images of the three supported templates (`public/landing/ats_single_column.png`, `modern_professional.png`, and `academic_cv.png`), generated directly from production `@react-pdf/renderer` templates and `pdf.js`.

To regenerate the landing page specimens at any time:
```bash
npx tsx scripts/generate-landing-specimens.ts
```
This script renders page 1 of each template using the fictional candidate fixture ("Alex Example"), verifies that each generated PNG asset is strictly under the 150 KB budget, and writes them to `public/landing/`. Specimen sizes and layout integrity are validated automatically in `src/tests/landing-copy-and-specimens.test.ts`.

---

## Measuring the Deployed Site (Production Performance Baseline)

Follow this standardized protocol to measure live production performance, diagnose latency bottlenecks, and audit geographic co-location.

### 1. Chrome DevTools Network Timing Protocol
1. Open Google Chrome in an **Incognito Window** (to avoid browser extension interference).
2. Open Chrome DevTools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`) and navigate to the **Network** tab.
3. Check the **Disable cache** checkbox in the top toolbar.
4. Filter by **Doc** (for SSR document routes `/dashboard`, `/profile`) or **Fetch/XHR** (for API routes `/api/documents/**`, `/api/profile/**`).
5. Select a network throttling profile:
   - **No Throttling**: Direct broadband connection.
   - **Fast 4G**: 1.6 Mbps download, 750 Kbps upload, 150ms round-trip latency.
6. Trigger the navigation or action (e.g. navigate to `/dashboard` or click Save in the editor).
7. Click the primary document or API request row and select the **Timing** tab:
   - **Queueing & Stalled**: Time waiting in browser connection pool.
   - **DNS Lookup & Initial Connection / SSL**: Connection setup overhead (reduced after initial connection).
   - **Waiting for server response (TTFB)**: Total time from HTTP request dispatch until the first byte arrives from the serverless function.
   - **Content Download**: Time spent transferring the HTTP response body over the wire.
   - **Total Duration**: End-to-end request latency.

### 2. Geographic Co-Location: Vercel vs Supabase Regions
Cross-region latency is the single largest contributor to slow TTFB on server-rendered routes and database mutations:
1. **Identify Supabase Database Region**:
   - Supabase Dashboard -> **Project Settings -> General -> Region** (e.g. `AWS - ap-northeast-1 (Tokyo)` or `us-east-1 (N. Virginia)`).
2. **Align Vercel Function Region**:
   - Vercel Dashboard -> **Project Settings -> Functions -> Function Region**:
     - `ap-northeast-1` (Tokyo) $\rightarrow$ `hnd1` (Tokyo, Japan)
     - `us-east-1` (N. Virginia) $\rightarrow$ `iad1` (Washington, D.C., USA)
     - `us-west-1` (N. California) $\rightarrow$ `sfo1` (San Francisco, USA)
     - `eu-central-1` (Frankfurt) $\rightarrow$ `fra1` (Frankfurt, Germany)
     - `eu-west-1` (Ireland) $\rightarrow$ `dub1` (Dublin, Ireland)
     - `ap-southeast-1` (Singapore) $\rightarrow$ `sin1` (Singapore)
   - Or configure `"regions": ["hnd1"]` in `vercel.json`.

> [!IMPORTANT]
> **Production Deployment Region Note**:
> Production Supabase is in Tokyo (`ap-northeast-1`), so the Vercel function region must match Tokyo (`hnd1`) rather than Mumbai or US-East. Note that the Supabase database region cannot be changed in place without migrating the database to a new project.
> Furthermore, if the Vercel function region cannot be changed on your plan, recommend measuring `/login` (static/edge) vs `/dashboard` (authenticated serverless + database) TTFB in Chrome DevTools Network timing before undertaking the operational effort of moving or re-provisioning the database.

### 3. Reading `Server-Timing` Headers
Quillfolio instruments its API and database routes with W3C `Server-Timing` response headers. In Chrome DevTools Network tab, inspect the response headers under **Server-Timing**:
- `auth;dur=X`: Latency of Supabase session authentication verification.
  - *Target*: 10–30ms (cached / direct session) vs 80–180ms (remote roundtrip).
  - *Baseline Measured*: 92.4ms (`/profile`), 107.3ms (`/dashboard`), 135.5ms (`/editor/[id]`) (see `reports/measure_routes.txt`).
- `db;dur=Y`: Latency of database transaction / query execution over connection pooler.
  - *Co-located target*: 8–25ms.
  - *Baseline Measured*: 95.8ms (`/profile`), 97.6ms (`/dashboard`), 102.5ms (`/editor/[id]`).
  - *Cross-region mismatch*: 120–280ms+ (indicates function region does not match database).
- `total;dur=Z`: Full server execution time inside the Next.js serverless route handler.
  - *Baseline Measured*: 188.2ms (`/profile`), 216.4ms (`/dashboard`), 223.1ms (`/editor/[id]`).

### 4. Trade-offs and Risks for Ranked Performance Fixes

| Rank | Performance Fix | Expected Gain | Inherent Trade-offs & Risks |
| :--- | :--- | :--- | :--- |
| **Fix 1** | **Local JWT Verification (`jose`)** | *(Estimated)* Eliminates 90–140ms remote roundtrip to `supabase.auth.getUser()` on authenticated routes (measured median `Server-Timing: auth` overhead: 92.4ms on `/profile`, 107.3ms on `/dashboard`, 135.5ms on `/editor/[id]` in `reports/measure_routes.txt`) by cryptographically verifying the Supabase JWT locally with the project public key or secret. | **Security / Revocation Risk**: Weakens immediate token revocation. If a user changes their password, revokes sessions, or is banned, the local token remains valid until its exp claim expires (up to 1 hour), unless a lightweight revoked-tokens Redis/KV blocklist is maintained. |
| **Fix 2** | **Strict Function Regional Co-location (`hnd1` / Tokyo)** | *(Estimated)* Eliminates 80–150ms cross-continent fiber roundtrips between Vercel Serverless Function and Supabase Postgres (e.g. avoiding 120ms+ Mumbai $\leftrightarrow$ Tokyo penalty). | **Operational Lock-in**: All serverless routes are pinned to a single geographic zone (`hnd1`). Users located far from Tokyo experience longer initial TTFB on the edge-to-origin leg unless combined with edge caching. |
| **Fix 3** | **Read-heavy Client SWR / Stale-While-Revalidate Caching** | *(Estimated)* Eliminates 200–400ms page transition latency by instantly displaying cached profile facts while revalidating in background. | **Cache Invalidation Complexity**: If a user modifies their master profile or CV in Tab A and navigates back in Tab B, stale data can briefly render until revalidation triggers, requiring disciplined mutation cache bust (`mutate()` / tags). |
| **Fix 4** | **Server Components Streaming with Suspense (`loading.tsx`)** | *(Estimated)* Reduces perceived load time to under 150ms by rendering instant layout skeletons while server data streams in. | **Micro-shift & Layout Thrash**: If skeleton bounding boxes differ from final rendered components by even a few pixels, visual layout shift occurs. On ultra-fast networks (<40ms), skeletons can flash briefly, requiring a minimal hold or debounce strategy. |
| **Fix 5** | **Database Index Tuning & Compound Indexes** | *(Estimated)* Reduces query latency from $O(N)$ sequential scan (15–50ms) to $O(\log N)$ index scan (1–3ms). | **Storage & Write Overhead**: Each secondary index increases disk storage footprint in Postgres and slightly increases latency on INSERT, UPDATE, and DELETE operations, requiring careful selection of only high-cardinality foreign keys (`user_id`, `document_id`). |

---

## Testing Architecture & Isolated Port Strategy

Quillfolio enforces strict isolation between test suites, active development servers, and production builds:

1. **Unit & Engine Tests (Vitest)**
   - **Command**: `npm test`
   - **Scope**: Validation schemas, PDF layout algorithms, natural delimiter wrapping, non-Latin script filtering, WCAG contrast audits, fontkit glyph coverage, and optimistic concurrency.
   - **Environment**: Runs offline in under 3 seconds with zero server dependency.

2. **Integration Tests (Vitest Integration Suite)**
   - **Command**: `npm run test:integration`
   - **Port**: Dedicated port `3101` (`http://localhost:3101`).
   - **Lifecycle**: `globalSetup` builds the project (`npm run build`), launches a dedicated production Next.js server on port 3101, executes the suite, and terminates the server on completion.
   - **Scope**: Live HTTP route tests against production API endpoints (`/api/documents/*`, `/api/profile/*`), dev route 404 guards (`/dev/*`), live database schema synchronization, and constraint verification.

3. **End-to-End Tests (Playwright)**
   - **Command**: `npx playwright test`
   - **Port**: Dedicated port `3100` (`http://localhost:3100`).
   - **Lifecycle**: Playwright's `webServer` builds first (`npm run build && npm run start -- -p 3100`) on port 3100 with `reuseExistingServer: false`.
   - **Scope**: Complete browser journeys, PDF download generation, ATS readiness checks, mobile toolbar layout-shift immunity, and extreme token rendering.

4. **Dev Template Gallery & Background Renderers**
   - **Vitest Render Spec**: `npx vitest run src/tests/dev-templates-gallery.test.ts`
   - **Interactive Dev Gallery**: In development mode (`NODE_ENV !== 'production'`), accessible at `http://localhost:3000/dev/templates`, `http://localhost:3000/dev/backgrounds`, and `http://localhost:3000/dev/glass`. In production deployments, these routes unconditionally trigger Next.js `notFound()`.

5. **Performance Budgets (`npm run perf:budget`)**
   - **Command**: `npm run perf:budget` (runs `scripts/measure-routes.ts --budget` against the local production build, writes `reports/perf-budget.json`, and fails if any median exceeds its budget by > 10%).
   - **Budgets (median of 5, mobile throttled 4x CPU / mid-range 4G)**: `/` JS `<= 450 KB`, `/login` JS `<= 650 KB`, `/dashboard` JS `<= 550 KB`, `/editor/[id]` initial JS `<= 1.2 MB`, first rendered PDF preview `<= 8 s` (`<= 3 s` desktop unthrottled).
   - **Font Subsetting**: `npm run subset:fonts` runs `scripts/subset-fonts.ts` using Python `fonttools` (`pyftsubset`) to regenerate the subsetted `.woff` fonts in `public/fonts/`.

5. **Production Safety & Test Project Allowlist**
   - **CRITICAL**: Automated test suites and user-manipulation scripts (`npm test`, `npm run test:integration`, `scripts/*.ts`) must **NEVER** be pointed at production databases or production Supabase projects.
   - Any script or test utilizing `SUPABASE_SERVICE_ROLE_KEY` to create, modify, or delete test users enforces `assertTestProjectRefAllowed()`, checking the Supabase project reference in `NEXT_PUBLIC_SUPABASE_URL` against a local, git-ignored `.test-projects` allowlist file.
   - If the project ref is not present in `.test-projects`, execution aborts immediately with a fatal security error.

---

## Account Management, Data Portability & Privacy (Phase 6A)

Quillfolio provides transparent, self-service account management, end-to-end data export, permanent account erasure with database cascade, and a public privacy notice.

### 1. Legal Configuration & Pre-Push Audit (`check:legal`)
Operator legal constants are centralized in `src/config/legal.ts`:
- `OPERATOR_NAME`: The legal entity or operator name.
- `CONTACT_EMAIL`: The designated privacy and contact email address.
- `DATABASE_REGION_LABEL`: Human-readable database location (`"Tokyo, Japan"`).
- `EFFECTIVE_DATE`: Effective date of the current policy.
- `PRIVACY_VERSION`: Semantic version string of the privacy policy.

> [!IMPORTANT]
> **Run `npm run check:legal` before deploying or pushing to main**:
> The repository provides a validation script `scripts/check-legal.ts` run via `npm run check:legal`. This script verifies that `OPERATOR_NAME` and `CONTACT_EMAIL` do not contain the unconfigured placeholder `"REPLACE_ME"`. The build does not fail automatically, but operators must run this check to ensure legal terms are populated before going live.

### 2. Data Portability & Export Format (`GET /api/account/export`)
Authenticated users can download their complete record at `/settings` or directly via `GET /api/account/export`:
- **Headers**: `Content-Disposition: attachment; filename="quillfolio-export-YYYY-MM-DD.json"`, `Cache-Control: no-store`.
- **Coverage**: Extracts 100% of user-owned rows across all 13 application database tables (`profiles`, `master_profiles`, `education`, `experiences`, `projects`, `skills`, `publications`, `achievements`, `certifications`, `custom_sections`, `documents`, `document_sections`, `ai_usage_logs`).
- **Validation**: Enforced via Zod schema (`AccountExportDataSchema` in `src/lib/account/export-schema.ts`).
- **Security Exclusions**: Columns containing password hashes, encrypted credentials, internal tokens, or secrets are explicitly excluded (`EXCLUDED_COLUMNS`).

### 3. Account Deletion & Database Cascades (`POST /api/account/delete`)
Users can permanently destroy their account and all associated records from `/settings`:
- **Authentication & Origin Check**: Requires authenticated user session; rejects mismatched `Origin` headers (CSRF defense).
- **Email Confirmation**: Requires typing the exact account email (case-insensitive, whitespace-trimmed) before submission.
- **Re-Authentication Window (`ACCOUNT_REAUTH_WINDOW_SECONDS`)**:
  - Default: `900` seconds (15 minutes). Configurable in seconds via environment variable `ACCOUNT_REAUTH_WINDOW_SECONDS` (bounded between 1 and 3600 seconds).
  - If the user's `last_sign_in_at` timestamp is older than the configured window, the API immediately halts with HTTP 403 `{"error": "...", "code": "REAUTH_REQUIRED"}`.
  - The UI presents a friendly explanation and a 1-click re-authentication link preserving return navigation via `safeNextPath('/settings', '/dashboard')`.
- **Cascading Database Erasure**:
  - The server invokes `supabase.auth.admin.deleteUser(user.id)`.
  - Migration `0009_profiles_auth_cascade.sql` links `public.profiles(id)` to `auth.users(id)` with `ON DELETE CASCADE`.
  - Postgres foreign keys cascade immediately down to `master_profiles`, `documents`, `document_sections`, `ai_usage_logs`, and all child profile tables (`education`, `experiences`, `projects`, `skills`, `publications`, `achievements`, `certifications`, `custom_sections`).
  - All child rows are deleted in a single transactional cascade. Subsequent export or login returns 401 Unauthorized.
- **Local Storage & Session Cleared**:
  - On successful deletion, the client script sweeps `localStorage`, purging any draft CVs (`cv_maker_draft_*`), temporary app keys (`quillfolio_*`), and cached Supabase session data (`sb-*`).
  - All auth session cookies are cleared, and the user is redirected to the public confirmation route `/goodbye`.

### 4. Public Privacy Notice (`/privacy`)
The public route `/privacy` describes the system's exact operational architecture:
- Hosted database: Supabase PostgreSQL in Tokyo, Japan (`ap-northeast-1`).
- Application host: Vercel serverless platform.
- Cookies: Strictly necessary HTTP-only authentication session cookies (`sb-*-auth-token`).
- Tracking: Zero third-party tracking scripts, zero advertising beacons, zero sale of personal data.

### 5. LEGAL REVIEW NEEDED
The following legal and compliance questions should be reviewed by legal counsel prior to commercial launch:
1. **Database Backups Retention**: When an account is permanently deleted via the API, transactional database rows are erased immediately. However, point-in-time recovery (PITR) physical database backups retained by the cloud infrastructure provider (Supabase AWS) persist for up to 7–30 days before natural rotation. Counsel should review standard contractual backup retention clauses.
2. **Age Verification & Minors (COPPA / GDPR-K)**: The service does not intentionally collect information from individuals under 13 (or under 16 in the EU/UK). An explicit age threshold affirmation or parent consent workflow should be reviewed if targeted at secondary education students.
3. **Governing Law & Jurisdiction**: The operator must specify the governing state/country law and chosen dispute arbitration/court forum in `src/config/legal.ts` and `/privacy`.
4. **Sub-Processor Data Processing Agreements (DPA)**: The operator must execute standard Data Processing Agreements with sub-processors: Supabase Inc. (database infrastructure in Tokyo) and Vercel Inc. (serverless edge execution).

---

## Cross-Browser Testing & Real Device Checks (Phase 8G)

### 1. Installing Firefox & WebKit for Playwright
Playwright runs cross-browser verification (`e2e/phase8g-browsers.spec.ts`) across Chromium, Firefox, and WebKit. Before running `npx playwright test` on a fresh machine, install the Firefox and WebKit browser binaries:
```bash
npx playwright install firefox webkit
```

### 2. Comparing Vercel Function Region vs Supabase Database Region
1. Check Supabase region in **Supabase Dashboard -> Project Settings -> General -> Region** (production is `ap-northeast-1` Tokyo).
2. Check Vercel region in **Vercel Dashboard -> Project Settings -> Functions -> Function Region** (`hnd1` Tokyo matches `ap-northeast-1`).
3. Open Chrome DevTools **Network** tab on `/dashboard`, `/profile`, or `/editor/[id]` and inspect the `Server-Timing` response header:
   - `db-count;dur=N`: sequential auth/DB round trips executed in the proxy/request layer.
   - `auth;dur=X` and `db;dur=Y`: if either is consistently `> 100 ms` while `/login` is `< 30 ms`, your Vercel function region and Supabase database region are not co-located.

### 3. Real Device Checks (Manual QA)
Run the following manual checks on physical **iPhone Safari (iOS)** and **Android Chrome**:
- **Landing (`/`)**: Verify sticky glass navbar blur/contrast, no horizontal overflow at `390px` and `320px`, and smooth native bounce (no custom wheel overscroll interference on iOS).
- **Onboarding (`/onboarding`)**: Verify radio-card selection, keyboard/touch focus, and form submission.
- **Dashboard (`/dashboard`)**: Tap **New document** to confirm the template chooser modal opens with crisp specimen thumbnails, type toggles, and no clipped buttons.
- **Master Profile (`/profile`) & Settings (`/settings`)**: Verify mobile tab bar / sub-navigation wrapping, User ID eye reveal toggle, and JSON export download.
- **Editor (`/editor/[id]`)**:
  - Verify the **Edit** tab opens immediately without downloading the PDF worker until **Preview** or **ATS** is tapped.
  - Tap **Preview** and verify A4 PDF rendering, zoom slider, **Fit to width**, section drag/reorder controls, and **Download PDF** save sheet on iOS Safari and Android Chrome.

