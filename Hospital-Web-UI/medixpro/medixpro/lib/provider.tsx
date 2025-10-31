"use client";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <NextThemeProvider enableSystem={false} defaultTheme="dark" attribute="class">
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;
