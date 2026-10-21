import { Routes, Route } from "react-router-dom";
import { Shell } from "./components/Shell";
import { HomePage } from "./pages/HomePage";
import { HealthPage } from "./pages/HealthPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { OffersPage } from "./pages/OffersPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}
