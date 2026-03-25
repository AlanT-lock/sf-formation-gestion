"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, QrCode, LogOut } from "lucide-react";

export function FormateurNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/formateur/login";
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 md:px-6 flex items-center justify-between h-14">
        <Link href="/formateur" className="font-semibold text-slate-800">
          SF Formation — Formateur
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/formateur"
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition
              ${pathname === "/formateur" ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100"}
            `}
          >
            <GraduationCap className="w-4 h-4" />
            Mes sessions
          </Link>
          <Link
            href="/formateur/qr"
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition
              ${pathname === "/formateur/qr" ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100"}
            `}
          >
            <QrCode className="w-4 h-4" />
            QR code
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </nav>
      </div>
    </header>
  );
}
