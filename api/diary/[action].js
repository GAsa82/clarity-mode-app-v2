// Single dynamic function for all /api/diary/* endpoints.
// Vercel Hobby caps deployments at 12 serverless functions; shipping process
// and generate as separate files pushed the project to 13 and the deployment
// failed at the "Deploying outputs" stage. Same fix as the coaching API: the
// handlers live in _handlers/ (underscore = not deployed as functions) and
// this file dispatches to them, so the whole diary API costs 1 function.
// URLs are unchanged: /api/diary/process, /api/diary/generate.

// Aliased on import: a binding literally named `process` would shadow Node's
// global `process` in this module scope, which is a nasty trap for anyone who
// later reaches for process.env here.
import processPage from "./_handlers/process.js";
import generateAsset from "./_handlers/generate.js";

const handlers = {
  process: processPage,
  generate: generateAsset,
};

export default function handler(req, res) {
  const h = handlers[req.query.action];
  if (!h) return res.status(404).json({ error: "Not found" });
  return h(req, res);
}
