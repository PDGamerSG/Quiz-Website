import type { Metadata, Viewport } from "next";
import { onest } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "quizly — HTML & JSON quizzes",
  description:
    "Import HTML or JSON quizzes, save your question library, practise by topic, and review every answer. Private, browser-based learning.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${onest.variable} h-full`}>
      <body className={`${onest.className} min-h-full antialiased`}>{children}</body>
    </html>
  );
}
