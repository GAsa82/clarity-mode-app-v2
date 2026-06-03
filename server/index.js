import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PHONE_ID = process.env.WHATSAPP_PHONE_ID?.trim();
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const RECIPIENTS = process.env.WHATSAPP_RECIPIENTS
  ?.split(",")
  .map((item) => item.trim())
  .filter(Boolean) ?? [];
const API_KEY = process.env.WHATSAPP_API_KEY?.trim();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();
const SENDER_EMAIL = process.env.SENDER_EMAIL?.trim();

if (!PHONE_ID || !ACCESS_TOKEN) {
  console.warn("WHATSAPP_PHONE_ID or WHATSAPP_ACCESS_TOKEN is not configured.");
}

if (SENDGRID_API_KEY && SENDER_EMAIL) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else if (SENDGRID_API_KEY && !SENDER_EMAIL) {
  console.warn("SENDGRID_API_KEY is set but SENDER_EMAIL is missing.");
}

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return next();
  }

  const headerKey = req.header("x-api-key");
  if (!headerKey || headerKey !== API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    text: { body: text },
  };
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

app.post("/api/send-whatsapp", requireApiKey, async (req, res) => {
  const { text, recipients } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  const targets = Array.isArray(recipients) && recipients.length ? recipients : RECIPIENTS;
  if (!targets.length) {
    return res.status(400).json({ error: "No recipient numbers configured" });
  }

  try {
    const results = [];
    for (const to of targets) {
      const data = await sendWhatsAppMessage(to, text);
      results.push({ to, data });
    }
    res.json({ ok: true, results });
  } catch (error) {
    const details = error?.response?.data || error?.message || String(error);
    console.error("WhatsApp send failed:", details);
    res.status(500).json({ error: "send_failed", details });
  }
});

app.post('/api/subscribe', requireApiKey, async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'missing_email' });

  // Optionally send a welcome email via SendGrid if configured
  if (SENDGRID_API_KEY && SENDER_EMAIL) {
    try {
      await sgMail.send({
        to: email,
        from: SENDER_EMAIL,
        subject: 'Welcome to The Sunday Reset',
        html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#070b14;border-radius:16px;color:#eef2f7;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4a8ef7,#3b6fcf);margin-bottom:24px;box-shadow:0 0 40px -8px rgba(74,142,247,0.4);"></div>
          <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;margin:0 0 8px;letter-spacing:-0.02em;">Welcome to<br/><span style="color:#b0c4de;font-style:italic;">The Sunday Reset.</span></h1>
          <p style="font-size:14px;line-height:1.7;color:#8896a8;margin:0 0 24px;">You're in. Every Sunday you'll get one short email to reset your mind, quiet the noise, and step into the week with clarity.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin-bottom:24px;" />
          <p style="font-size:12px;color:#5a687a;margin:0;">— Clarity Mode</p>
        </div>`,
      });
      return res.json({ ok: true, sent: true });
    } catch (err) {
      console.error('SendGrid send failed:', err?.response?.body || err);
      return res.status(502).json({ error: 'send_failed' });
    }
  }

  // If SendGrid not configured, return ok so frontend can proceed with local save
  res.json({ ok: true, sent: false });
});

app.post('/api/signin', requireApiKey, async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'missing_email' });

  if (SENDGRID_API_KEY && SENDER_EMAIL) {
    try {
      await sgMail.send({
        to: email,
        from: SENDER_EMAIL,
        subject: 'Welcome to Clarity Mode — You Signed In',
        html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#070b14;border-radius:16px;color:#eef2f7;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4a8ef7,#3b6fcf);margin-bottom:24px;box-shadow:0 0 40px -8px rgba(74,142,247,0.4);"></div>
          <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;margin:0 0 8px;letter-spacing:-0.02em;">Thanks for signing in<br/>to <span style="color:#b0c4de;font-style:italic;">Clarity Mode.</span></h1>
          <p style="font-size:14px;line-height:1.7;color:#8896a8;margin:0 0 24px;">You now have access to the full clarity system. Start your session from the dashboard whenever you're ready.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin-bottom:24px;" />
          <p style="font-size:12px;color:#5a687a;margin:0;">— Clarity Mode</p>
        </div>`,
      });
      return res.json({ ok: true, sent: true });
    } catch (err) {
      console.error('SendGrid signin email failed:', err?.response?.body || err);
      return res.status(502).json({ error: 'send_failed' });
    }
  }

  res.json({ ok: true, sent: false });
});

// ─── Proxy: forward AI/API routes to FastAPI backend ──────────────────────────
const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// ─── Debug endpoint: test connectivity to Express + FastAPI ───────────────────
app.get("/api/debug", async (req, res) => {
  const result = { express: "ok", fastapi: "unknown", ai_provider: "unknown" };
  try {
    const resp = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    result.fastapi = resp.data?.status === "ok" ? "ok" : `error: ${resp.data?.status}`;
    // Try to get provider status
    try {
      const pResp = await axios.get(`${BACKEND_URL}/api/chat/providers/status`, { timeout: 5000 });
      result.ai_provider = pResp.data?.count > 0 ? "ok" : "no providers enabled";
    } catch {
      result.ai_provider = "unreachable";
    }
  } catch (err) {
    result.fastapi = `unreachable: ${err?.message}`;
    result.ai_provider = "unreachable";
  }
  res.json(result);
});

// ─── Request logger (for debugging) ─────────────────────────────────────────
app.use("/api", (req, res, next) => {
  console.log(`[express] ${req.method} ${req.originalUrl}`);
  next();
});

// ─── Proxy targets (local dev only — in production Vercel rewrites to Railway)

app.use("/api/chat", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${BACKEND_URL}${req.originalUrl}`,
      data: req.body,
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err?.response?.status || 502;
    const data = err?.response?.data || { detail: "Backend unavailable" };
    console.error(`[proxy] ${req.method} ${req.originalUrl} -> ${status}`);
    res.status(status).json(data);
  }
});

app.use("/api/health", async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(200).json({ status: "ok", service: "Clarity AI (degraded)", version: "1.0.0" });
  }
});

app.use("/api/upload", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${BACKEND_URL}${req.originalUrl}`,
      data: req.body,
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err?.response?.status || 502;
    const data = err?.response?.data || { detail: "Backend unavailable" };
    res.status(status).json(data);
  }
});

app.use("/api/upload-diary", async (req, res) => {
  try {
    // Forward multipart form data
    const response = await axios({
      method: req.method,
      url: `${BACKEND_URL}${req.originalUrl}`,
      data: req.body,
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
      timeout: 120000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err?.response?.status || 502;
    const data = err?.response?.data || { detail: "Backend unavailable" };
    res.status(status).json(data);
  }
});

app.use("/api/dashboard", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${BACKEND_URL}${req.originalUrl}`,
      data: req.body,
      timeout: 30000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err?.response?.status || 502;
    const data = err?.response?.data || { detail: "Backend unavailable" };
    res.status(status).json(data);
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`\n  Clarity Mode local server running on http://localhost:${port}`);
  console.log(`  Proxying /api/chat, /api/health, /api/upload, /api/dashboard -> ${BACKEND_URL}`);
  console.log();
});
