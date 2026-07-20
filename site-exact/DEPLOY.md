# Exact site — deploy guide

This folder is a **pixel-perfect copy of your Framer site** (`henilgajjar.framer.ai`) —
the real Framer HTML, the real motion/animation engine, fonts, and images. A `rerouter.js`
rewrites all of Framer's CDN URLs to the local `images/` and `js/` files, so it is fully
self-contained and needs no build step.

## Run it locally

From this folder:

```bash
npx serve .
```

Then open the URL it prints (e.g. http://localhost:3000). `serve` gives you the same
clean-URL routing (`/experience`, `/projects`, …) that Vercel uses.

## Deploy to Vercel (your domain)

**Option A — dashboard (recommended)**
1. Push the repo to GitHub.
2. In [vercel.com](https://vercel.com) → **Add New → Project** → pick the repo.
3. Set **Root Directory** to `site-exact`.
4. **Framework Preset**: `Other` (it's plain static HTML — no build command).
5. Deploy. `vercel.json` here enables clean URLs automatically.

**Option B — terminal**
```bash
cd site-exact
npx vercel        # first run: link/create the project
npx vercel --prod # deploy to production
```

## Your custom domain
Vercel dashboard → project → **Settings → Domains** → add your domain, then paste the
DNS records Vercel shows into your domain registrar. HTTPS is automatic.

## Notes
- `vercel.json` sets `cleanUrls: true` so `experience.html` is served at `/experience`.
- Google Analytics (`gtag`) and Framer analytics calls are harmless no-ops when self-hosted.
- To edit content, edit the `.html` files directly (they're large, machine-generated Framer
  output). For easier long-term editing, see the hand-built React version in the repo root.
