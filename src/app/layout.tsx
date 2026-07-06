import type { Metadata } from "next";
import { Poppins, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ["bengali", "latin"],
  variable: "--font-hind",
});

export const metadata: Metadata = {
  title: "Catalogue Database",
  description: "Internal Dashboard for tracking and validating classes.",
};

import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${hindSiliguri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans text-ink dark:text-white bg-[linear-gradient(-45deg,#F1F2FB,#E2E4F6,#FCE8F5,#FDF5FA)] dark:bg-[#000000] bg-[length:400%_400%] animate-[gradientBG_15s_ease_infinite] selection:bg-magenta-light selection:text-magenta-dark">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
