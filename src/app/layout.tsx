import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caishen - Your Personal Financial Assistant",
  description: "Take control of your finances with AI-powered insights, smart expense tracking, and seamless WhatsApp integration.",
  icons: {
    icon: '/caishen.ico',
    shortcut: '/caishen.ico',
    apple: '/caishen.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
