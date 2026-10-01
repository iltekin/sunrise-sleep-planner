import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sunrise Sleep Planner",
  description: "Sunrise-focused sleep schedule generator",
  icons: {
    icon: [
      { url: "icon.svg", type: "image/svg+xml" },
      { url: "favicon.ico", sizes: "any" },
    ],
    apple: "apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-full font-sans flex flex-col">{children}</body>
    </html>
  );
}
