// Single dynamic function for /api/admin/* — Vercel Hobby caps deployments
// at 12 serverless functions; handlers live in _handlers/ (underscore =
// not deployed) so this costs 1 slot regardless of how many actions it
// grows to hold. URLs: /api/admin/subscribe, /api/admin/set-role.
import subscribe from "./_handlers/subscribe.js";
import setRole from "./_handlers/set-role.js";

const handlers = { subscribe, "set-role": setRole };

export default function handler(req, res) {
  const h = handlers[req.query.action];
  if (!h) return res.status(404).json({ error: "Not found" });
  return h(req, res);
}
