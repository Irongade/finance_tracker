import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: { default: "Ade & P", template: "%s · Ade & P" },
  description: "Household finance tracker",
  applicationName: "Ade & P Finance Tracker",
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "Ade & P", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1F3864",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" theme="light" richColors closeButton />
      </body>
    </html>
  );
}
