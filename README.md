This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Testing Architecture & Environment Isolation

### Test Modes & Commands

1. **Unit & Engine Tests (Vitest)**
   - **Command**: `npm test`
   - **Scope**: Pure unit tests, validation schemas, WCAG contrast audits, fontkit glyph coverage, hyphenation/unbreakable token handling, PDF extraction, and document concurrency logic.
   - **Environment**: Runs completely offline/standalone with zero HTTP server dependency.

2. **Integration Tests (Vitest Integration Suite)**
   - **Command**: `npm run test:integration`
   - **Scope**: Live HTTP route tests against production API endpoints (`/api/documents/*`, `/api/profile/*`), dev route 404 guards (`/dev/*`), and direct PostgreSQL constraint / RLS verification.
   - **Environment**: Executes against a running production server using `vitest.integration.config.ts`. All test users and created records are cleaned up in `afterAll` hooks.

3. **End-to-End Tests (Playwright)**
   - **Command**: `npx playwright test`
   - **Scope**: Full browser flows across viewports (1440px, 1280px, 1100px, 390px, 360px, 320px), PDF download generation, ATS readiness checks, keyboard focus visibility, panel background isolation, and zero-layout-shift toolbar behavior.
   - **Environment**: Automatically boots and tests against a dedicated production build (`npm run start -- -p 3100`) on port `3100` with `reuseExistingServer: false` to eliminate collision with any active local dev server.

4. **Dev Template Gallery & Background Renderers**
   - **Vitest Render Spec**: `npx vitest run src/tests/dev-templates-gallery.test.ts`
   - **Interactive Dev Gallery**: In development mode (`NODE_ENV !== 'production'`), accessible at `http://localhost:3000/dev/templates` and `http://localhost:3000/dev/backgrounds`. In production deployments, these routes unconditionally trigger Next.js `notFound()`.
