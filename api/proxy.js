// Robust reverse proxy for the SIFT trial (fallback to the simple vercel.json
// rewrite). Use this if the one-line rewrite doesn't pass the password prompt
// or breaks assets. It forwards every request to the real site so the browser
// only ever talks to this Vercel domain, passes the Basic-Auth challenge and
// credentials straight through, and rewrites redirect targets back here.
//
// To use it, replace vercel.json with the contents of vercel.function.json.

export const config = { api: { bodyParser: false } };

const ORIGIN = "https://sift-ai.co.uk";

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", () => resolve(Buffer.concat(chunks)));
  });
}

export default async function handler(req, res) {
  // With the catch-all rewrite, req.url is the original path + query string.
  const targetUrl = ORIGIN + req.url;

  // Forward request headers, dropping the ones a proxy must not relay.
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (["host", "connection", "content-length"].includes(key)) continue;
    headers[key] = v; // Authorization / cookie pass through unchanged
  }

  const method = req.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);

  let upstream;
  try {
    upstream = await fetch(targetUrl, { method, headers, body, redirect: "manual" });
  } catch (e) {
    res.statusCode = 502;
    res.end("Proxy error: " + e.message);
    return;
  }

  // Relay status and response headers back to the browser.
  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    // Let the platform re-encode/length the body itself.
    if (["content-encoding", "content-length", "transfer-encoding", "connection"].includes(k)) return;
    // Keep the browser on this Vercel domain: strip the origin off any redirect.
    if (k === "location") value = value.replace(ORIGIN, "");
    res.setHeader(key, value); // www-authenticate / set-cookie pass through
  });

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.end(buf);
}
