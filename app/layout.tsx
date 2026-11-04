import { AuthProvider } from "@/features/auth";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/features/theme";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Via Fidei",
    template: "%s | Via Fidei",
  },
  description: "Igrejas católicas de Maceió/AL",
  keywords: [
    "igrejas",
    "católicas",
    "Maceió",
    "Alagoas",
    "paróquias",
    "missas",
  ],
  authors: [{ name: "Via Fidei" }],
  // Favicon e ícone Apple vêm de `app/icon.png` e `app/apple-icon.png`
  // (convenção de arquivos do App Router, VF-090).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Via Fidei",
    title: "Via Fidei",
    description: "Igrejas católicas de Maceió/AL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Via Fidei",
    description: "Igrejas católicas de Maceió/AL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
