import type { Metadata } from "next";
import { Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { CursorGlow } from "@/components/CursorGlow";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Capabble | Unified Examination Operations Platform",
  description: "Brings examination operations into one reliable workflow. Plan, execute, and track exams with confidence.",
  keywords: ["examination operations", "CBSE exams", "school administration", "exam centre management", "seating plans", "answer sheet tracking"],
  openGraph: {
    title: "Capabble | Unified Examination Operations Platform",
    description: "Run your entire exam centre process from one Capabble dashboard.",
    type: "website",
    locale: "en_IN",
    siteName: "Capabble",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${outfit.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <CursorGlow />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "dark:bg-brand-900 dark:text-brand-100",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
