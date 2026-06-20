import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { NotificationProvider } from "@/components/NotificationContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoTrack AI | Carbon Footprint Awareness & Reduction Platform",
  description: "Calculate your carbon footprint, receive AI-powered eco-friendly insights, track weekly challenges in real-time, and compare your progress on the global leaderboard.",
  keywords: ["carbon footprint calculator", "climate change", "eco track", "reduce emissions", "sustainability tracker", "gamified climate action"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans eco-bg-animate">
        <NotificationProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}

