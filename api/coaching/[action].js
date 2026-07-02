// Single dynamic function for all /api/coaching/* endpoints.
// Vercel Hobby caps deployments at 12 serverless functions; the individual
// handlers live in _handlers/ (underscore = not deployed as functions) and
// this file dispatches to them, so the whole coaching API costs 1 function.
// URLs are unchanged: /api/coaching/bookings, /checkout, /slots, /verify.

import bookings from "./_handlers/bookings.js";
import checkout from "./_handlers/checkout.js";
import slots from "./_handlers/slots.js";
import verify from "./_handlers/verify.js";

const handlers = { bookings, checkout, slots, verify };

export default function handler(req, res) {
  const h = handlers[req.query.action];
  if (!h) return res.status(404).json({ error: "Not found" });
  return h(req, res);
}
