/**
 * SuperAdminLayout — Layout principal du dashboard superadmin.
 * Assemble Sidebar + Header + zone de contenu.
 * Applique le thème choisi (dark, light, blue, emerald, purple).
 */
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const THEME_CLASSES = {
  dark:    "bg-slate-950 text-slate-100",
  light:   "bg-gray-100 text-gray-900",
  blue:    "bg-blue-950 text-blue-100",
  emerald: "bg-emerald-950 text-emerald-100",
  purple:  "bg-purple-950 text-purple-100",
};

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [theme, setTheme] = useState(() => localStorage.getItem("soubremarket_theme") || "dark");

  // Écouter les changements de thème (quand saveTheme est appelé)
  useEffect(() => {
    const handler = () => {
      const t = localStorage.getItem("soubremarket_theme") || "dark";
      setTheme(t);
    };
    window.addEventListener("theme:change", handler);
    return () => window.removeEventListener("theme:change", handler);
  }, []);

  const themeClass = THEME_CLASSES[theme] || THEME_CLASSES.dark;

  return (
    <div className={`min-h-screen ${themeClass} flex transition-colors duration-300`}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          period={period}
          onPeriodChange={setPeriod}
        />

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ period }} />
        </main>
      </div>
    </div>
  );
}