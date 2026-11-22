# Quillfolio

Quillfolio is an intelligent career-profile platform that understands the individual before generating their professional identity across ATS-optimized PDF resumes, academic CVs, and published personal websites.

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
3. `0004_db_constraints.sql` (Regex, Length Checks, & Reserved Username Trigger)
4. `0005_version_and_caps.sql` (Optimistic Concurrency Versions & Per-User Row Caps)
5. `0006_missing_caps.sql` (Row Caps for Certifications, Publications, Achievements, Custom Sections)
6. `0007_indexes.sql` (Performance Indexes, Search Paths, and Anon/Authenticated Privilege Hardening)
7. `0008_drop_duplicate_indexes.sql` (Drop Redundant Duplicate Indexes Covered by Unique Constraints)

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
  - All 15 public tables exist (derived dynamically from `src/lib/db/schema.ts` + `app_migrations`): `achievements`, `ai_usage_logs`, `app_migrations`, `certifications`, `custom_sections`, `document_sections`, `documents`, `education`, `experiences`, `master_profiles`, `profiles`, `projects`, `publications`, `skills`, `websites`.
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

### Step 7: Comparing Vercel Function Region with Supabase Database Region
To prevent cross-region latency penalties (which can add 100ms+ round-trip delays on every database query, session check, or save mutation), ensure your Vercel Serverless Function region directly matches your Supabase database region:

1. **Locate Supabase Database Region**:
   - In Supabase Dashboard -> **Project Settings -> General**, find the **Region** (e.g. `AWS - us-east-1 (N. Virginia)`, `AWS - eu-central-1 (Frankfurt)`, or `AWS - ap-southeast-1 (Singapore)`).
   - The direct connection host reflects this: e.g. `aws-0-us-east-1.pooler.supabase.com`.

2. **Locate & Configure Vercel Serverless Function Region**:
   - In Vercel Dashboard -> **Project Settings -> Functions -> Function Region**, select the region code matching your Supabase region:
     - `us-east-1` (N. Virginia) $\rightarrow$ `iad1` (Washington, D.C., USA)
     - `us-west-1` (N. California) $\rightarrow$ `sfo1` (San Francisco, USA)
     - `eu-central-1` (Frankfurt) $\rightarrow$ `fra1` (Frankfurt, Germany)
     - `eu-west-1` (Ireland) $\rightarrow$ `dub1` (Dublin, Ireland)
     - `ap-southeast-1` (Singapore) $\rightarrow$ `sin1` (Singapore)
   - Alternatively, configure `"regions": ["iad1"]` in `vercel.json`.

3. **Verify Latency via Server-Timing**:
   - Open browser DevTools Network tab on `/dashboard` or `/profile` and inspect the `Server-Timing` HTTP response header:
     - **Co-located**: `db;dur=8..25ms`
     - **Cross-region mismatch**: `db;dur=120..280ms` (indicates functions and database are in different geographic regions).

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
   - **Interactive Dev Gallery**: In development mode (`NODE_ENV !== 'production'`), accessible at `http://localhost:3000/dev/templates` and `http://localhost:3000/dev/backgrounds`. In production deployments, these routes unconditionally trigger Next.js `notFound()`.

5. **Production Safety & Test Project Allowlist**
   - **CRITICAL**: Automated test suites and user-manipulation scripts (`npm test`, `npm run test:integration`, `scripts/*.ts`) must **NEVER** be pointed at production databases or production Supabase projects.
   - Any script or test utilizing `SUPABASE_SERVICE_ROLE_KEY` to create, modify, or delete test users enforces `assertTestProjectRefAllowed()`, checking the Supabase project reference in `NEXT_PUBLIC_SUPABASE_URL` against a local, git-ignored `.test-projects` allowlist file.
   - If the project ref is not present in `.test-projects`, execution aborts immediately with a fatal security error.

