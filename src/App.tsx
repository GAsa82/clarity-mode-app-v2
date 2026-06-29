import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";
import { VaultProvider } from "@/contexts/VaultContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import InsightsPage from "./pages/InsightsPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refunds from "./pages/Refunds";
import { FocusRoomPage } from "./pages/FocusRoomPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import PricingPage from "./pages/PricingPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import CoachingPage from "./pages/CoachingPage";
import BookingPage from "./pages/coaching/BookingPage";
import ConfirmationPage from "./pages/coaching/ConfirmationPage";
import AdminCoaching from "./pages/admin/AdminCoaching";
import ResearchPage from "./pages/ResearchPage";
import VaultUnavailable from "./pages/VaultUnavailable";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUpload from "./pages/admin/AdminUpload";
import AdminKnowledge from "./pages/admin/AdminKnowledge";
import AdminTraining from "./pages/admin/AdminTraining";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <VaultProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/room/:slug" element={<FocusRoomPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/coaching" element={<CoachingPage />} />
              <Route path="/coaching/book" element={<BookingPage />} />
              <Route path="/coaching/confirmation" element={<ConfirmationPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/vault-unavailable" element={<VaultUnavailable />} />

              {/* Admin routes - protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="upload" element={<AdminUpload />} />
                <Route path="knowledge" element={<AdminKnowledge />} />
                <Route path="training" element={<AdminTraining />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="coaching" element={<AdminCoaching />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </VaultProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
