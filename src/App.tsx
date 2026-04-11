import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Header />
        <main className="main-content">
          <Suspense fallback={<div className="loading">Loading…</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/company/:id" element={<CompanyPage />} />
              <Route path="/country/:code" element={<CountryPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
