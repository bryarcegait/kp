import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3001"),
  title: "Kanto't Pakpakan | Restaurant System",
  description: "Management system for Kanto't Pakpakan",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Kanto't Pakpakan",
    description: "Restaurant management system",
    images: ["/kanto-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
