import type { Metadata, Viewport } from "next";
import { onest } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "quizly — HTML & JSON quizzes",
  description:
    "Import HTML or JSON quizzes, explore a shared quiz library, practise by topic, and learn from detailed explanations with private result history.",
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
