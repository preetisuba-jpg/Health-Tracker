# Jignesh Health Companion — Standalone App

This is a real, independent website — not a Claude artifact. Installed on Jignesh's
phone, it opens as its own app icon with its own screen, no browser chrome, and no
connection to your Claude account. It still calls Claude for the smart features (food
check on unlisted dishes, the Ask panel), but through your own backend, not through
claude.ai.

## What's in this folder
- `index.html` — the whole app (React loaded from a CDN, no build step needed)
- `manifest.json`, `sw.js`, `icons/` — make it installable as a real app icon
- `api/chat.js` — a small backend function that holds your Anthropic API key and
  forwards requests to Claude. Required because a key placed directly in the phone's
  code would be public and exploitable — this keeps it server-side.

## What you need before deploying
1. **A free GitHub account** — github.com — to hold these files.
2. **A free Vercel account** — vercel.com — sign up with "Continue with GitHub."
3. **An Anthropic API key** — console.anthropic.com → Settings → API Keys → Create
   Key. This is a *separate, paid* thing from your claude.ai subscription — API usage
   is billed per request. For a single person's daily food checks and questions, cost
   will be small (cents to a few dollars a month), but it isn't free, and you'll need
   to add a payment method on the Anthropic console for it to work.

## Deploy steps (one-time setup, ~15 minutes)

1. **Create a GitHub repo**
   - Go to github.com → New repository → name it e.g. `jignesh-health-app` → Create.
   - On the repo page, click "uploading an existing file" and drag in every file from
     this folder (keep the `api/` and `icons/` folders — GitHub preserves folder
     structure when you drag a folder in). Commit.

2. **Import into Vercel**
   - Go to vercel.com → Add New → Project → pick the `jignesh-health-app` repo →
     Import. Leave all settings as default → Deploy.
   - You'll get a URL like `jignesh-health-app.vercel.app` — this works immediately
     for the app shell, but the "smart" features (Food Check on new dishes, Ask panel)
     will show an error until step 3 is done.

3. **Add your API key**
   - In the Vercel project → Settings → Environment Variables.
   - Add: Name = `ANTHROPIC_API_KEY`, Value = the key from console.anthropic.com.
   - Go to Deployments → click the "..." on the latest deployment → Redeploy (env
     vars only take effect after a redeploy).

4. **Install it on Jignesh's phone**
   - Open the `*.vercel.app` URL in Safari (iPhone) or Chrome (Android) — this is a
     regular website, not claude.ai, so there's no app-hijacking issue this time.
   - iPhone: Share icon → Add to Home Screen.
   - Android: ⋮ menu → Add to Home screen (or "Install app" if offered).
   - It now opens as its own standalone app, no browser bar, no Claude branding.

## Ongoing
- His daily logs (food, habits, supplements) live in the phone's own local storage —
  private to his device, not synced anywhere, not visible to you unless he shows you.
- If you want shared visibility (e.g. you checking his adherence remotely), that's a
  further step — a real backend database instead of local storage — tell me if you
  want that built next.
- To update the app later (new features, bug fixes), send me the changed files again
  and re-upload them to the same GitHub repo — Vercel redeploys automatically on
  every commit.
