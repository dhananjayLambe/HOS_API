import ThemeProvider from "@/lib/provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
import GlobalLoader from "@/components/GlobalLoader";
import { Toaster } from "react-hot-toast";
export const metadata: Metadata = {
  title: "MedixPro - Modern Healthcare Management System",
  description: "Streamline your clinic operations with our comprehensive, HIPAA-compliant platform designed for modern healthcare providers. Patient management, appointment scheduling, digital prescriptions, and more.",
  keywords: "healthcare management, clinic management, patient management, medical software, HIPAA compliant, appointment scheduling, digital prescriptions",
  authors: [{ name: "MedixPro Team" }],
  openGraph: {
    title: "MedixPro - Modern Healthcare Management System",
    description: "Streamline your clinic operations with our comprehensive, HIPAA-compliant platform designed for modern healthcare providers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background-color: white !important;
              color: rgb(15 23 42) !important;
            }
            .dark html, .dark body {
              background-color: rgb(2 6 23) !important;
              color: white !important;
            }
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning style={{ backgroundColor: 'white' }}>
        <ThemeProvider>{children}</ThemeProvider>
        <GlobalLoader /> {/* ⬅ loader always available */}
        <Toaster position="center" />
      </body>
    </html>
  );
}
