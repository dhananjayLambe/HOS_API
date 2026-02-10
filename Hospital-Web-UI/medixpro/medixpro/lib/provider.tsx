"use client";
import { ThemeProvider as NextThemeProvider } from "next-themes";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemeProvider enableSystem={false} defaultTheme="dark" attribute="class" suppressHydrationWarning>
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;
