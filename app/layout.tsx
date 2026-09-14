import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorRing from "@/components/CursorRing";

// Self-hosted via the `geist` package (no Google Fonts network fetch at
// build time — safer for CI/sandboxed builds and identical on Vercel).

export const metadata: Metadata = {
  title: "Palette — Art for every wall on earth",
  description:
    "Fine-art prints from independent artists, produced to order and shipped worldwide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink overflow-x-hidden">
        <LangProvider>
          <CursorRing />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
