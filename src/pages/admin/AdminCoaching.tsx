import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar, Clock, User, Mail, Phone, CheckCircle,
  XCircle, AlertCircle, RefreshCw, MessageSquare, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_challenge: string | null;
  session_date: string;
  session_time: string;
  status: string;
  payment_status: string;
  amount: number;
  meet_link: string | null;
  session_notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "text-yellow-400 bg-yellow-400/10",
  confirmed: "text-blue-400 bg-blue-400/10",
  completed: "text-green-400 bg-green-400/10",
  cancelled: "text-red-400 bg-red-400/10",
  no_show:   "text-orange-400 bg-orange-400/10",
};

export default function AdminCoaching() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/coaching/bookings", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const d = await res.json();
      setBookings(d.bookings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (session) load(); }, [session]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/coaching/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function saveNotes(id: string) {
    setSaving(true);
    await fetch("/api/coaching/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ id, session_notes: notes }),
    });
    setSaving(false);
    load();
  }

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    revenue:   bookings.filter(b => b.payment_status === "paid").length * 3000,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coaching Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all 1-on-1 session bookings</p>
        </div>
        <Button variant="glass" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: stats.total,     icon: Calendar },
          { label: "Confirmed",      value: stats.confirmed, icon: CheckCircle },
          { label: "Completed",      value: stats.completed, icon: CheckCircle },
          { label: "Revenue",        value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="glass border border-white/10 rounded-xl p-5">
            <s.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Session</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.client_name}</div>
                      <div className="text-muted-foreground text-xs">{b.client_email}</div>
                      {b.client_phone && <div className="text-muted-foreground text-xs">{b.client_phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {b.session_date}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {b.session_time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.payment_status === "paid" ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"
                      }`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(b); setNotes(b.session_notes || ""); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Details
                        </button>
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(b.id, "completed")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Session Details</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{selected.client_name}</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{selected.client_email}</div>
              {selected.client_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{selected.client_phone}</div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{selected.session_date} · {selected.session_time}</div>
              {selected.meet_link && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <a href={selected.meet_link} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                    {selected.meet_link}
                  </a>
                </div>
              )}
              {selected.client_challenge && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Client's Challenge</p>
                  <p className="text-foreground/80">{selected.client_challenge}</p>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-xs text-muted-foreground mb-2 font-medium">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Session Notes / Action Plan
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add session notes, action plan, key insights..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="glass" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="hero" className="flex-1" disabled={saving} onClick={() => saveNotes(selected.id)}>
                {saving ? "Saving…" : "Save Notes"}
              </Button>
            </div>

            <div className="flex gap-2 mt-3">
              {["confirmed","completed","cancelled"].map(s => (
                <button
                  key={s}
                  onClick={() => { updateStatus(selected.id, s); setSelected(null); }}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                    selected.status === s
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 hover:bg-white/5 text-muted-foreground"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
