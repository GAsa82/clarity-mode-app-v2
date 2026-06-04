import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refetch } = useSubscription();

  useEffect(() => {
    // Re-fetch subscription so UI updates immediately
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">You're now Premium!</h1>
        <p className="text-muted-foreground max-w-md">
          Welcome to the full Clarity Mode experience. AI Coach, premium focus rooms, and deep
          insights are now unlocked.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button variant="hero" onClick={() => navigate("/ai-coach")}>
          <Sparkles className="w-4 h-4 mr-2" /> Open AI Coach
        </Button>
        <Button variant="glass" onClick={() => navigate("/")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
