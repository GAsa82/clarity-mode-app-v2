import { useState, useEffect } from "react";
import { Settings, Shield, Mail, Key, Save, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AdminEmail {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [adminEmails, setLocalAdminEmails] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingAdmins, setExistingAdmins] = useState<AdminEmail[]>([]);

  useEffect(() => {
    loadAdminEmails();
  }, []);

  const loadAdminEmails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, created_at")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        setExistingAdmins(data);
        setLocalAdminEmails(data.map((a) => a.email).join("\n"));
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to load admin emails");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminEmails = async () => {
    try {
      setSaveError(null);
      const emails = adminEmails
        .split("\n")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

      // For each email in the list, upsert the profile with role='admin'
      for (const email of emails) {
        // Check if user exists in profiles
        const { data: existing } = await supabase
          .from("profiles")
          .select("id, email, role")
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          // Update role to admin
          await supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", existing.id);
        } else {
          // Insert new profile with admin role
          await supabase.from("profiles").insert({
            email,
            role: "admin",
            name: email.split("@")[0],
          });
        }
      }

      // Demote admins that were removed from the list
      const removedAdmins = existingAdmins.filter(
        (a) => !emails.includes(a.email)
      );
      for (const admin of removedAdmins) {
        await supabase
          .from("profiles")
          .update({ role: "user" })
          .eq("id", admin.id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadAdminEmails();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save admin emails");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your badly talks admin panel
        </p>
      </div>

      {/* Admin Emails */}
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Admin Access</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          One email per line. Users signing in with these emails will have admin privileges.
          These are managed via Supabase profiles with the "admin" role.
        </p>

        {/* Current admins */}
        {existingAdmins.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-2">Current Admins:</p>
            <div className="space-y-1">
              {existingAdmins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>{admin.email}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    {admin.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={adminEmails}
          onChange={(e) => setLocalAdminEmails(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary outline-none text-sm transition-colors resize-none font-mono"
          placeholder="admin@example.com"
        />
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSaveAdminEmails}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Admin Emails
              </>
            )}
          </button>
        </div>
        {saveError && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" />
            {saveError}
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Environment</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={import.meta.env.VITE_SUPABASE_URL || "Not configured"}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border text-sm transition-colors font-mono opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
               API Backend URL
            </label>
            <input
              type="text"
              value={import.meta.env.VITE_API_URL || "Not configured"}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border text-sm transition-colors font-mono opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-xl bg-card border border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          These actions are irreversible. Be careful.
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (window.confirm(
                "This deletes all rows in the diaries and upload_history tables " +
                "(legacy document-upload data) only. It does NOT touch content_items, " +
                "testimonials, research_papers, old_books, orders, or any other CMS " +
                "content. This cannot be undone. Continue?"
              )) {
                try {
                  await supabase.from("diaries").delete().neq("id", "none");
                  await supabase.from("upload_history").delete().neq("id", "none");
                  alert("Diary and upload history data cleared.");
                } catch (err: any) {
                  alert(`Error: ${err.message}`);
                }
              }
            }}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            Clear Diary &amp; Upload History
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Legacy data from the removed document-analysis feature only — not your website content.
        </p>
      </div>
    </div>
  );
}