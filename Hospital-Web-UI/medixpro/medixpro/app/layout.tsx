//app/layout.tsx
import ThemeProvider from "@/lib/provider";
import { AuthProvider } from "@/lib/authContext";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
import GlobalLoader from "@/components/GlobalLoader";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

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
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <GlobalLoader />
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
