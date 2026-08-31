import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PETIVA - AI Powered Pet Healthcare Ecosystem",
  description: "Connected care for pet owners, veterinarians, and clinics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a]">{children}</body>
    </html>
  );
}
