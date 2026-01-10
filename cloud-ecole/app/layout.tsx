import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schoolab | Administration",
  description: "Plateforme de gestion centralisée pour l'application Schoolab",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
