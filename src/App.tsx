import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import Header from "./components/Header";
import "./App.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const AboutPhotosPage = lazy(() => import("./pages/AboutPhotosPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));

/** Standard chrome (header + main) for the catalogue routes. */
function MainLayout() {
  return (
    <div className="gof-app">
      <Header />
      <main className="gof-main">
        <Suspense fallback={<div className="gof-empty">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/company/:id" element={<CompanyPage />} />
          <Route path="/country/:code" element={<CountryPage />} />
          <Route path="/about/photos" element={<AboutPhotosPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
