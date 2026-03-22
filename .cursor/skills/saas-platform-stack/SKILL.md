---
name: saas-platform-stack
description: >-
  Delivers full-stack SaaS patterns for Vite/React apps backed by Supabase
  (Postgres, Auth, RLS) and deployed on Vercel: layered architecture, schema
  design, authentication, RBAC, approval workflows, dashboard UI, searchable
  tables, notifications, reporting/analytics, and deployment. Use when
  designing or implementing project architecture, database schema, Supabase
  auth, roles and permissions, approval flows, dashboards, data tables with
  search/filter/pagination, notifications, reports, or Vercel deployment.
---

# SaaS platform stack (React · Supabase · Vercel)

Apply this skill when building or refactoring features in this stack. Prefer existing project patterns; extend them before inventing new ones.

## Project architecture

- **Layers**: UI (routes/components) → data hooks/services → Supabase client (browser) or server calls. Keep secrets and privileged logic off the client.
- **Boundaries**: One place for Supabase initialization; typed DTOs or generated types for tables; avoid raw SQL strings scattered in components.
- **Feature folders**: Group by domain (e.g. `leaves`, `approvals`) with `components`, `hooks`, `api` as the project already does.
- **Env**: `VITE_*` for public config only; never expose service role keys to the client.

## Database schema design

- **Core**: Normalize entities; use UUID primary keys with `gen_random_uuid()`; explicit foreign keys with `ON DELETE` behavior chosen per relationship.
- **Multi-tenant / org scope**: If applicable, add `org_id` (or equivalent) early and index it; every query path should be scoped consistently.
- **Audit**: `created_at`, `updated_at`; optional `created_by` / `updated_by` where accountability matters.
- **Status fields**: Use enums or check constraints; document valid transitions (see Approval workflow).
- **Migrations**: One logical change per migration; reversible when possible; avoid breaking renames without a transition period.

## Supabase authentication

- **Client**: Use a single Supabase client; subscribe to `onAuthStateChange` for session lifecycle; clear local state on sign-out.
- **Session**: Persist via Supabase defaults; avoid duplicating tokens in custom storage unless required.
- **Profiles**: Mirror `auth.users` into a `profiles` (or similar) table with RLS so the app reads profile data from Postgres, not only JWT claims.
- **Email / OAuth**: Configure redirect URLs for each environment (local, preview, production).

## Role-based access control

- **Model**: Represent roles in Postgres (e.g. `user_roles` or a `role` column on `profiles`). Avoid trusting client-only role checks for sensitive actions.
- **RLS**: Enable RLS on all user-facing tables; policies express “who can read/write which rows” using `auth.uid()` and role/tenant columns.
- **Patterns**: Separate policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE`; use `(select auth.uid())` in policies for stable evaluation; index columns used in policy predicates.
- **App layer**: UI may hide actions by role, but **enforce** the same rules in RLS or Edge Functions for mutations that must not be forgeable.

## Approval workflow system

- **States**: Finite set (e.g. `draft` → `pending` → `approved` | `rejected`); store `status`, `submitted_at`, `decided_at`, `decided_by` as needed.
- **Transitions**: Only allow valid transitions (trigger, constraint, or transactional RPC); reject double-submits and duplicate approvals.
- **Concurrency**: Use row-level locking or optimistic checks (`WHERE status = expected`) on update to prevent races.
- **History**: Optional `approval_events` / audit log table for compliance and UI timelines.
- **Notifications**: Emit on state change (see Notifications); keep side effects idempotent.

## Dashboard UI design

- **Layout**: Predictable grid, consistent spacing scale (Tailwind), clear page title and primary action.
- **States**: Loading skeletons or spinners, empty states with next step, error states with retry; avoid blank screens.
- **Accessibility**: Semantic headings, focus order, sufficient contrast; charts and KPIs need text alternatives or labels.
- **Performance**: Lazy-load heavy widgets; avoid N+1 client requests; aggregate on the server when possible.

## Table search, filter, pagination

- **Server-side**: For large datasets, filter and paginate in Postgres (`limit`/`offset` or keyset pagination on `(created_at, id)`).
- **URL sync**: Encode filters and page in query params so views are shareable and refresh-safe.
- **Debounce** search input (e.g. 300ms) before firing queries.
- **UX**: Show result counts when cheap; disable or clarify “next” when no more rows; reset page when filters change.

## Notifications system

- **Types**: In-app (`notifications` table + RLS), email (Supabase hooks or Edge Function + provider), optional Realtime for instant UI updates.
- **Delivery**: Prefer async queue or fire-and-forget Edge Function with retries for email; log failures.
- **Content**: Immutable payload or references to entity IDs; avoid leaking sensitive data in email subjects/bodies.
- **Read state**: `read_at` or `is_read`; optional batch mark-as-read.

## Reports and analytics

- **Aggregations**: Use SQL/RPC for sums, counts, and time buckets; avoid loading full tables to the client for reports.
- **Caching**: For expensive dashboards, materialized views or scheduled refresh if the product allows eventual consistency.
- **Exports**: CSV generation server-side for large exports; stream when possible.
- **Time zones**: Store UTC; convert for display; be explicit in date-range filters.

## Deployment (Vercel)

- **Build**: `npm run build`; output from Vite defaults (`dist`); set **Framework Preset** to Vite or static as appropriate.
- **Env**: Production and Preview env vars in Vercel; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for client; never commit secrets.
- **Routing**: SPA fallback to `index.html` for client-side routes.
- **Supabase**: Add Vercel preview URLs to Supabase Auth redirect allowlist for OAuth and magic links.

## Checklist (new feature touching data)

- [ ] Schema + migration align with RLS and roles
- [ ] Policies tested for each role path
- [ ] UI matches enforced permissions (no “fake” security)
- [ ] Lists use server-side pagination if data can grow
- [ ] Approval transitions are atomic and validated
- [ ] Env and redirects updated for new deployments if auth URLs change
