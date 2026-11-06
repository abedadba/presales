import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Call Generator — PS-4 MVP",
  description:
    "Fill the lead form, preview the generated lead document, and download it locally as Markdown.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to generator
        </a>
        {children}
      </body>
    </html>
  );
}
