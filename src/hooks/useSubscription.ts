import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Plan = "free" | "premium" | "annual";

export interface Subscription {
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string | null;
  providerSubscriptionId: string | null;
}

export function useSubscription() {
  const { user, isAdmin: isAdminFromAuth } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdminFromDB, setIsAdminFromDB] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user || !isSupabaseReady()) { setLoading(false); return; }

    setLoading(true);

    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .gte("current_period_end", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setIsAdminFromDB(profile?.role === "admin");

    setSubscription(
      sub
        ? {
            plan:                   sub.plan as Plan,
            status:                 sub.status,
            currentPeriodEnd:       sub.current_period_end,
            cancelAtPeriodEnd:      sub.cancel_at_period_end,
            provider:               sub.provider,
            providerSubscriptionId: sub.provider_subscription_id,
          }
        : null
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isAdmin = isAdminFromDB || isAdminFromAuth;
  const isPremium = !loading && (subscription !== null || isAdmin);
  const plan: Plan = isAdmin ? "annual" : (subscription?.plan ?? "free");

  return { subscription, isPremium, isAdmin, plan, loading, refetch: fetchSubscription };
}
