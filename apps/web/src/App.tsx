import { Routes, Route, useLocation } from "react-router-dom";
import { Shell } from "./components/Shell";
import { LandingPage } from "./pages/LandingPage";
import { HealthPage } from "./pages/HealthPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { OffersPage } from "./pages/OffersPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EarningsPage } from "./pages/EarningsPage";
import { OfferCapsPage } from "./pages/OfferCapsPage";
import { CampaignStudioPage } from "./pages/CampaignStudioPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPage";
import { CompliancePage } from "./pages/CompliancePage";
import { PayoutsPage } from "./pages/PayoutsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ConversionConfidencePage } from "./pages/ConversionConfidencePage";
import { TrackingLinksPage } from "./pages/TrackingLinksPage";
import { SmartlinksPage } from "./pages/SmartlinksPage";
import { DisputesPage } from "./pages/DisputesPage";
import { IntegrityPage } from "./pages/IntegrityPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { VerificationStatusPage } from "./pages/VerificationStatusPage";
import { AdminApplicationsPage } from "./pages/AdminApplicationsPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPublishersPage } from "./pages/AdminPublishersPage";
import { AdminAdvertisersPage } from "./pages/AdminAdvertisersPage";
import { AdminOffersPage } from "./pages/AdminOffersPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
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
  const isMarketing = location.pathname === "/";

  if (isMarketing) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    );
  }

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
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/applications" element={<AdminApplicationsPage />} />
        <Route path="/admin/publishers" element={<AdminPublishersPage />} />
        <Route path="/admin/advertisers" element={<AdminAdvertisersPage />} />
        <Route path="/admin/offers" element={<AdminOffersPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
        <Route path="/admin/tracking" element={<AdminTrackingPage />} />
        <Route path="/admin/cms" element={<AdminCmsPage />} />
        <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
        <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/ai-tools" element={<AdminAiToolsPage />} />
        <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
        <Route path="/earnings" element={<EarningsPage />} />
        <Route path="/conversion-confidence" element={<ConversionConfidencePage />} />
        <Route path="/offer-caps" element={<OfferCapsPage />} />
        <Route path="/campaign-studio" element={<CampaignStudioPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
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
