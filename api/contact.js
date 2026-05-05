/**
 * Vercel Serverless Function: POST /api/contact
 *
 * Required environment variables:
 * - RESEND_API_KEY
 * - CONTACT_TO_EMAIL
 * Optional:
 * - CONTACT_FROM_EMAIL (default: on-boarding@resend.dev)
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const honeypot = String(body.website_url || "").trim();

    // Honeypot: bots often fill hidden fields. Return success-like response
    // so bot behavior isn't reinforced with explicit errors.
    if (honeypot) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";

    if (!apiKey || !to) {
      return res.status(500).json({ ok: false, error: "Email service not configured" });
    }

    // Basic in-memory rate limiting per client IP.
    // Good enough for launch-phase spam reduction on low traffic.
    const ip = getClientIp(req);
    const now = Date.now();
    const limit = getRateLimitState();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxPerWindow = 5;
    const key = ip || "unknown";
    const entry = limit.get(key);
    if (!entry || now > entry.resetAt) {
      limit.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > maxPerWindow) {
        return res.status(429).json({ ok: false, error: "Too many messages. Please try again later." });
      }
    }

    const spam = scoreSpam({ name, email, message });
    const spamSignals = [];
    if (spam.score >= 4) spamSignals.push(`spam-score:${spam.score}`);
    if (spam.matches.length) spamSignals.push(`keywords:${spam.matches.join("|")}`);

    const html = `
      <h2>New website contact</h2>
      ${spamSignals.length ? `<p><strong>Admin signal:</strong> ${escapeHtml(spamSignals.join(" · "))}</p>` : ""}
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `${spam.score >= 4 ? "[Review] " : ""}Navigator contact from ${name}`,
        html
      })
    });

    if (!resendResp.ok) {
      const errorText = await resendResp.text();
      return res.status(502).json({ ok: false, error: `Email send failed: ${errorText}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
};

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (Array.isArray(xff)) return xff[0];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
}

function getRateLimitState() {
  if (!globalThis.__contactRateLimit) {
    globalThis.__contactRateLimit = new Map();
  }
  return globalThis.__contactRateLimit;
}

function scoreSpam({ name, email, message }) {
  const text = `${name}\n${email}\n${message}`.toLowerCase();
  const riskyTerms = [
    "crypto",
    "bitcoin",
    "forex",
    "casino",
    "loan",
    "seo service",
    "backlink",
    "guest post",
    "buy now",
    "whatsapp",
    "telegram",
    "http://",
    "https://"
  ];

  const matches = [];
  let score = 0;
  for (const term of riskyTerms) {
    if (text.includes(term)) {
      matches.push(term);
      score += term === "http://" || term === "https://" ? 1 : 2;
    }
  }
  if (message.length > 1400) score += 1;
  if ((message.match(/\n/g) || []).length > 20) score += 1;

  return { score, matches };
}
