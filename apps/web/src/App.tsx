import { Routes, Route } from "react-router-dom";
import { Shell } from "./components/Shell";
import { HomePage } from "./pages/HomePage";
import { HealthPage } from "./pages/HealthPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}
