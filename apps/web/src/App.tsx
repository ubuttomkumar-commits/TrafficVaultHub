import { Routes, Route, useLocation } from "react-router-dom";
import { Shell } from "./components/Shell";
import { AdminGuard } from "./components/AdminGuard";
import { LandingPage } from "./pages/LandingPage";
import { HealthPage } from "./pages/HealthPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { OffersPage } from "./pages/OffersPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EarningsPage } from "./pages/EarningsPage";
import { OfferCapsPage } from "./pages/OfferCapsPage";
import { CampaignStudioPage } from "./pages/CampaignStudioPage";
import { PrivacyPage, TermsPage, CompliancePolicyPage } from "./pages/LegalPage";
import { PayoutsPage } from "./pages/PayoutsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ConversionConfidencePage } from "./pages/ConversionConfidencePage";
import { TrackingLinksPage } from "./pages/TrackingLinksPage";
import { SmartlinksPage } from "./pages/SmartlinksPage";
import { DisputesPage } from "./pages/DisputesPage";
import { IntegrityPage } from "./pages/IntegrityPage";
import { VerificationStatusPage } from "./pages/VerificationStatusPage";

// Dedicated Super Admin Module Pages
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminApplicationsPage } from "./pages/AdminApplicationsPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPublishersPage } from "./pages/AdminPublishersPage";
import { AdminAdvertisersPage } from "./pages/AdminAdvertisersPage";
import { AdminOffersPage } from "./pages/AdminOffersPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminCompliancePage } from "./pages/AdminCompliancePage";
import { AdminPayoutsPage } from "./pages/AdminPayoutsPage";
import { AdminTrackingPage } from "./pages/AdminTrackingPage";
import { AdminCmsPage } from "./pages/AdminCmsPage";
import { AdminAnnouncementsPage } from "./pages/AdminAnnouncementsPage";
import { AdminMaintenancePage } from "./pages/AdminMaintenancePage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminAiToolsPage } from "./pages/AdminAiToolsPage";
import { AdminAuditLogPage } from "./pages/AdminAuditLogPage";

function AppRoutes() {
  const location = useLocation();
  const pathname = location.pathname;

  // 1. Standalone Public Marketing Landing Page
  if (pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    );
  }

  // 2. Standalone Dedicated Platform Operator Login Page (No Public Shell, No Leakage)
  if (pathname === "/admin/login") {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
    );
  }

  // 3. Isolated Super Admin Operations Environment (Enclosed strictly in AdminGuard)
  if (pathname.startsWith("/admin")) {
    return (
      <AdminGuard>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/applications" element={<AdminApplicationsPage />} />
          <Route path="/admin/publishers" element={<AdminPublishersPage />} />
          <Route path="/admin/advertisers" element={<AdminAdvertisersPage />} />
          <Route path="/admin/offers" element={<AdminOffersPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/compliance" element={<AdminCompliancePage />} />
          <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
          <Route path="/admin/tracking" element={<AdminTrackingPage />} />
          <Route path="/admin/cms" element={<AdminCmsPage />} />
          <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
          <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/ai-tools" element={<AdminAiToolsPage />} />
          <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AdminGuard>
    );
  }

  // 4. Public and Partner Portal Shell
  return (
    <Shell>
      <Routes>
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/tracking-links" element={<TrackingLinksPage />} />
        <Route path="/smartlinks" element={<SmartlinksPage />} />
        <Route path="/disputes" element={<DisputesPage />} />
        <Route path="/integrity" element={<IntegrityPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verification" element={<VerificationStatusPage />} />
        <Route path="/earnings" element={<EarningsPage />} />
        <Route path="/conversion-confidence" element={<ConversionConfidencePage />} />
        <Route path="/offer-caps" element={<OfferCapsPage />} />
        <Route path="/campaign-studio" element={<CampaignStudioPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/compliance" element={<CompliancePolicyPage />} />
        <Route path="/payouts" element={<PayoutsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}

export function App() {
  return <AppRoutes />;
}
