import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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
  title: "Clothing Business Platform",
  description: "Clothing business management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The document language and direction follow the account preference or the
  // visitor's choice, so Arabic renders end-to-left everywhere.
  const { tag, dir } = await getInterfaceLanguage();

  return (
    <html
      lang={tag}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
