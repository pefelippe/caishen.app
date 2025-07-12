import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caishen - Discover your new financial assistant",
  description: "Manage your finances on your WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} style={{ backgroundColor: '#1b4332' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
