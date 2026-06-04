import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

interface Props {
  children: React.ReactNode;
  feature?: string;
}

export function PremiumGate({ children, feature = "this feature" }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign in to continue</h2>
          <p className="text-muted-foreground max-w-sm">
            Create a free account to access {feature}.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="hero" onClick={() => navigate("/login?mode=signup")}>
            Create free account
          </Button>
          <Button variant="glass" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // Logged in but not premium
  if (!isPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Premium required</h2>
          <p className="text-muted-foreground max-w-sm">
            Unlock {feature} and the full Clarity Mode experience — from $12/month or ₹999/month.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="hero" onClick={() => navigate("/pricing")}>
            <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Premium
          </Button>
          <Button variant="glass" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
