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
  icons: {
    icon: "/images/via-fidei-logo.png",
    apple: "/images/via-fidei-logo.png",
  },
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
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
