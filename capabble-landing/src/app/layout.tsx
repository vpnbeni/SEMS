import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { CursorGlow } from "@/components/CursorGlow";

export const metadata: Metadata = {
  title: "Capabble | Cloud Platform for School and Examination Operations",
  description:
    "Explore Capabble's 16 connected operational modules spanning centre control, timetable, exam cell, finance, stock, transport, academics, staff, students, and communication.",
  keywords: [
    "capabble",
    "cntr",
    "examination operations",
    "school administration",
    "exam centre management",
    "seating plans",
    "answer sheet tracking",
    "multi-tenant education software",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Capabble | Cloud Platform for School and Examination Operations",
    description:
      "See how Capabble presents its 16-module platform while routing institutions into CNTR for central exam operations.",
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
      <body className="font-sans antialiased">
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
