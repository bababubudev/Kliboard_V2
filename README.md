# Kliboard v2

Temporary text clipboard for the web. Create named spaces, paste text, share via the space name. Spaces auto-delete after a chosen duration. No login required for basic use.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict)
- **React 19** (Server Components)
- **Supabase** (PostgreSQL, Auth, Storage)
- **TanStack Query** (caching, polling)
- **Tailwind CSS 4** + **shadcn/ui**
- **Upstash Redis** (rate limiting)
- **Vercel** (deployment)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in Supabase and Upstash credentials

# Start local Supabase
supabase start
supabase db push

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret for cron cleanup endpoint |

## Scripts

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Features

- **Named spaces** with shareable URLs (`/space/my-notes`)
- **Auto-expiration** (5 min to 10 days)
- **File uploads** (images, PDFs, documents) via Supabase Storage
- **Markdown** rendering and preview
- **Password protection** for private spaces
- **Lock/unlock** spaces to control editing
- **Admin dashboard** for platform management (stats, users, all spaces)
- **No login required** for creating and viewing public spaces

## Project Structure

```
app/              Next.js pages and API routes
  admin/          Admin dashboard
  api/            Route handlers (spaces, files, admin, cron)
  space/[name]/   Space view/edit page
components/
  ui/             shadcn/ui components
  space/          Space-specific components
  layout/         Navbar, footer
hooks/            TanStack Query hooks
lib/              Supabase clients, schemas, constants, utilities
supabase/         SQL migrations
```

## License

Private project.
