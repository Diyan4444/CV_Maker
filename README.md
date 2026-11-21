# Quillfolio

Quillfolio is an intelligent career-profile platform that understands the individual before generating their professional identity across ATS-optimized PDF resumes, academic CVs, and published personal websites.

## Getting Started

### Prerequisites
- Node.js `>=22.13.0` (LTS)
- npm `>=10.0.0`

### Environment Configuration
Copy `.env.example` to `.env.local` and supply your Supabase and PostgreSQL connection credentials:

```bash
cp .env.example .env.local
```

### Database Migrations (`db:apply`)
Quillfolio uses an atomic, checksum-verified migration runner. Migrations in `supabase/migrations/*.sql` are executed in strict numeric order inside individual transactions:

```bash
# Applies all unapplied migrations and records SHA-256 checksums in app_migrations
npm run db:apply
```

- **Runtime Connection (`DATABASE_URL`)**: Uses Supabase's Transaction Pooler (Supavisor on port 6543) with `prepare: false` and `max: 1` per instance for serverless Next.js functions.
- **Migration Connection (`MIGRATION_DATABASE_URL`)**: Uses direct or session connection (port 5432) for executing DDL, constraints, triggers, and table alterations.

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

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
