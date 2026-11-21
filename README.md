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

#### Serverless Database Configuration References:
- **Supabase Serverless & Connection Pooling**: [Supabase Pooler Documentation](https://supabase.com/docs/guides/database/connecting-to-postgres#serverless-and-transaction-pooler)
- **Supabase Transaction Mode Requirements**: [Supabase PgBouncer & Supavisor Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#how-connection-pooling-works)
- **Postgres.js Serverless & Prepared Statements**: [Postgres.js Serverless Documentation](https://github.com/porsager/postgres#serverless--prepared-statements)
- **Postgres.js Connection Options**: [Postgres.js Connection Parameters](https://github.com/porsager/postgres#connection-parameters)

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
