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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user || !isSupabaseReady()) { setLoading(false); return; }

    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .gte("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSubscription(
      data
        ? {
            plan:                   data.plan as Plan,
            status:                 data.status,
            currentPeriodEnd:       data.current_period_end,
            cancelAtPeriodEnd:      data.cancel_at_period_end,
            provider:               data.provider,
            providerSubscriptionId: data.provider_subscription_id,
          }
        : null
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPremium = !loading && subscription !== null;
  const plan: Plan = subscription?.plan ?? "free";

  return { subscription, isPremium, plan, loading, refetch: fetchSubscription };
}
