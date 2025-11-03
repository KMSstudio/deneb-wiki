// @/app/layout.tsx

// Font
import { Geist, Geist_Mono } from "next/font/google";
// Metadata
import type { Metadata } from "next";
// Styles
import Header from "@/app/Header";
import "@/styles/globals.css";
import "@/styles/theme.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "CSE Wiki", description: "Department of Computer Science & Engineering Wiki" };
export const revalidate = 0;

/**
 * Root layout that injects the verified session user into the client tree.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
