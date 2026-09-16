# SIFT trial — Vercel reverse proxy (temporary access workaround)

## What this is and why

UKSBS (UKRI's network) is blocking the trial link, so participants can't reach
it. This is a **reverse proxy**: it puts the trial behind a Vercel URL so a
participant's browser only ever talks to the **Vercel domain**, and Vercel
fetches the real site (`sift-ai.co.uk`) server-side. Because the browser never
navigates to `sift-ai.co.uk`, a **domain-level block is bypassed**.

It does **not** change the security: the SIFT password prompt still appears and
still protects access — it just comes through the Vercel domain now. This is a
**temporary workaround**, not the long-term setup.

> A plain "forwarding" link (a redirect) would NOT fix this — the browser would
> still end up on the blocked domain. A reverse proxy is the version that works.

## Deploy (into the PA Vercel environment)

From this folder:

```bash
npx vercel        # first deploy (links/creates the project — pick the PA scope/team)
npx vercel --prod # promote to a stable *.vercel.app URL
```

or drag this folder into the Vercel dashboard (New Project → deploy). No build
step, no dependencies. You'll get a URL like `https://sift-trial.vercel.app`.

## The access test (the key action item)

Open the Vercel URL **from the restricted UKSBS network** and note what happens:

- **You see the SIFT password prompt** → the block was on the *domain*. The
  proxy works. Distribute this Vercel URL to participants (with Becky's
  explanation that the previous link had access issues). ✅
- **The Vercel URL is *also* blocked / no password prompt** → the block is being
  triggered by the **Basic-Auth prompt itself**, not the domain. No proxy fixes
  that — we need to **replace Basic Auth with a form-based login** (the separate
  UKSBS auth thread). Escalate that instead. ⚠️

Either outcome is useful: it tells us whether this is a domain block or an
auth-method block.

## If the simple version misbehaves

`vercel.json` uses a one-line rewrite (no code) — try it first. If the password
prompt doesn't render, or assets/Ask SIFT break through it, switch to the
explicit proxy function:

```bash
cp vercel.function.json vercel.json   # route everything through api/proxy.js
npx vercel --prod
```

`api/proxy.js` forwards all headers (including `Authorization`), returns the
`WWW-Authenticate` challenge and cookies, and rewrites any redirect back to the
Vercel domain — i.e. full control over the Basic-Auth handshake.

## Notes / limits

- Credentials still travel over HTTPS end to end (browser→Vercel and
  Vercel→origin are both TLS). The proxy sees them in transit, as any proxy
  does — fine for a closed trial of public-domain data, but another reason the
  form-login is the better long-term fix.
- The origin currently answers `401 WWW-Authenticate: Basic realm="SIFT dev"`
  until credentials are supplied — that's the prompt you're testing for.
- Same trial password as today; nothing about the login changes.
