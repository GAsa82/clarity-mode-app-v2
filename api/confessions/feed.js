import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();

  const { category = "All", sort = "recent", limit = "20", offset = "0" } = req.query;

  let query = supabase
    .from("confessions")
    .select("id,anon_id,content,category,react_relate,react_support,react_advice,react_strong,reply_count,is_success,created_at")
    .eq("is_approved", true)
    .eq("is_flagged", false)
    .limit(parseInt(limit))
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (category !== "All") query = query.eq("category", category);
  if (sort === "success")  query = query.eq("is_success", true);

  if (sort === "recent" || sort === "success") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "supported") {
    query = query.order("react_support", { ascending: false });
  } else if (sort === "relatable") {
    query = query.order("react_relate", { ascending: false });
  } else if (sort === "trending") {
    // Trending = high engagement in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", weekAgo)
                 .order("react_relate", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ confessions: data || [] });
}
