import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Header from "./components/Header";
import "./App.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const AboutPhotosPage = lazy(() => import("./pages/AboutPhotosPage"));

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="gof-app">
        <Header />
        <main className="gof-main">
          <Suspense fallback={<div className="gof-empty">Loading…</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/company/:id" element={<CompanyPage />} />
              <Route path="/country/:code" element={<CountryPage />} />
              <Route path="/about/photos" element={<AboutPhotosPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
