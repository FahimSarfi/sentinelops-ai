import type { Metadata } from "next";
import "./globals.css";
import "./preview.css";
import "./redesign.css";
import "./product.css";
import "./workspace-refresh.css";
import "./workspace-clean.css";
export const metadata: Metadata = {
  title: "SentinelOps AI — Clarity for every incident.",
  description:
    "Evidence-backed incident investigation, human-approved repairs, and verified recovery. Explore SentinelOps AI, built for neatHack 2026.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
