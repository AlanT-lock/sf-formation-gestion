"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

export default function FormateurQRPage() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string>("");

  useEffect(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = `${origin}/stagiaire/login`;
    setLoginUrl(url);
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">QR code connexion stagiaire</h1>
      <p className="text-slate-600 text-sm">
        Les stagiaires peuvent scanner ce QR code pour accéder directement à la page de connexion de leur espace.
      </p>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-primary-600" />
            Page de connexion stagiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {dataUrl ? (
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <img
                src={dataUrl}
                alt="QR code vers la page de connexion stagiaire"
                className="w-[280px] h-[280px]"
              />
            </div>
          ) : (
            <div className="w-[280px] h-[280px] flex items-center justify-center bg-slate-100 rounded-lg text-slate-500">
              Chargement…
            </div>
          )}
          <p className="text-xs text-slate-500 text-center break-all">
            {loginUrl || "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
