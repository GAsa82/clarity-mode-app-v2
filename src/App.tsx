import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";
import { WebsiteProvider } from "@/contexts/WebsiteContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PWAUpdater } from "@/components/pwa/PWAUpdater";
import { syncCanonical } from "@/lib/seo";

// Landing + auth load eagerly for instant first paint on mobile.
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

// Everything else is code-split so mobile visitors don't download the
// admin/founder bundles to view the public site.
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refunds = lazy(() => import("./pages/Refunds"));
const FocusRoomPage = lazy(() => import("./pages/FocusRoomPage").then((m) => ({ default: m.FocusRoomPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PaymentSuccess = lazy(() => import("./pages/payment/PaymentSuccess"));
const CoachingPage = lazy(() => import("./pages/CoachingPage"));
const BookingPage = lazy(() => import("./pages/coaching/BookingPage"));
const ConfirmationPage = lazy(() => import("./pages/coaching/ConfirmationPage"));
const ResearchPage = lazy(() => import("./pages/ResearchPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const FounderStudio = lazy(() => import("./pages/FounderStudio"));

// Admin — core
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCoaching = lazy(() => import("./pages/admin/AdminCoaching"));

// Admin — content studio
const ContentStudioPage = lazy(() => import("./pages/admin/ContentStudioPage"));
const ResearchPapersAdmin = lazy(() => import("./pages/admin/ResearchPapersAdmin"));
const OldBooksAdmin = lazy(() => import("./pages/admin/OldBooksAdmin"));
const ContentItemsAdmin = lazy(() => import("./pages/admin/ContentItemsAdmin"));
const ClaritySessionsAdmin = lazy(() => import("./pages/admin/ClaritySessionsAdmin"));
const TestimonialsAdmin = lazy(() => import("./pages/admin/TestimonialsAdmin"));
const SiteContentAdmin = lazy(() => import("./pages/admin/SiteContentAdmin"));
const MediaLibraryAdmin = lazy(() => import("./pages/admin/MediaLibraryAdmin"));
const CreateWebsiteAdmin = lazy(() => import("./pages/admin/CreateWebsiteAdmin"));
const FaceSubmissionsAdmin = lazy(() => import("./pages/admin/FaceSubmissionsAdmin"));
const DiaryAdmin = lazy(() => import("./pages/admin/DiaryAdmin"));

// Admin — system
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage"));
const SubscriptionsAdmin = lazy(() => import("./pages/admin/SubscriptionsAdmin"));
const OrdersAdmin = lazy(() => import("./pages/admin/OrdersAdmin"));
const CouponsAdmin = lazy(() => import("./pages/admin/CouponsAdmin"));
const AuditLogsAdmin = lazy(() => import("./pages/admin/AuditLogsAdmin"));
const PresenceVerificationAdmin = lazy(() => import("./pages/admin/PresenceVerificationAdmin"));

// Lightweight branded fallback while a route chunk loads.
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const queryClient = new QueryClient();

/**
 * index.html ships one static canonical tag pointing at "/" — every route
 * inherited it, telling search engines every other page is a duplicate of
 * the homepage. This keeps it in sync with the actual URL on every
 * navigation; pages with richer needs (title/description/OG) layer useSEO
 * on top of this.
 */
const CanonicalSync = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    syncCanonical(pathname);
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdater />
        <AuthProvider>
          <BrowserRouter>
              <CanonicalSync />
              <Suspense fallback={<RouteFallback />}>
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
                <Route path="/research/:id" element={<ResearchPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/library/:id" element={<LibraryPage />} />

                {/* Founder Studio — full-screen business OS, admin-only */}
                <Route
                  path="/founder"
                  element={
                    <ProtectedRoute requireAdmin>
                      <WebsiteProvider>
                        <FounderStudio />
                      </WebsiteProvider>
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes — protected, scoped to WebsiteProvider */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <WebsiteProvider>
                        <AdminLayout />
                      </WebsiteProvider>
                    </ProtectedRoute>
                  }
                >
                  {/* Core */}
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="subscriptions" element={<SubscriptionsAdmin />} />
                  <Route path="orders" element={<OrdersAdmin />} />
                  <Route path="coupons" element={<CouponsAdmin />} />

                  {/* Multi-site */}
                  <Route path="create-website" element={<CreateWebsiteAdmin />} />

                  {/* Content Studio */}
                  <Route path="content-studio" element={<ContentStudioPage />} />
                  <Route path="research-papers" element={<ResearchPapersAdmin />} />
                  <Route path="old-books" element={<OldBooksAdmin />} />
                  <Route path="library" element={<ContentItemsAdmin type="pdf" title="Premium Library" />} />
                  <Route path="frameworks" element={<ContentItemsAdmin type="framework" title="Frameworks" />} />
                  <Route path="protocols" element={<ContentItemsAdmin type="protocol" title="Protocols" />} />
                  <Route path="templates" element={<ContentItemsAdmin type="template" title="Templates" />} />
                  {/* Generated by the Diary — need their own admin pages or
                      published articles/insights can't be edited anywhere. */}
                  <Route path="articles" element={<ContentItemsAdmin type="article" title="Articles" />} />
                  <Route path="insights" element={<ContentItemsAdmin type="insight" title="Insights" />} />
                  <Route path="clarity-sessions" element={<ClaritySessionsAdmin />} />
                  <Route path="media" element={<MediaLibraryAdmin />} />

                  {/* Diary — admin-only personal knowledge engine */}
                  <Route path="diary" element={<DiaryAdmin />} />

                  {/* Website content */}
                  <Route path="site-content" element={<SiteContentAdmin />} />
                  <Route path="testimonials" element={<TestimonialsAdmin />} />
                  <Route path="face-submissions" element={<FaceSubmissionsAdmin />} />

                  {/* System */}
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="audit-logs" element={<AuditLogsAdmin />} />
                  <Route path="presence-verification" element={<PresenceVerificationAdmin />} />
                  <Route path="coaching" element={<AdminCoaching />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <InstallPrompt />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
