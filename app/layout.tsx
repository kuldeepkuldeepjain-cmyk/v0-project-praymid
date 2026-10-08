import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ToastProvider } from "@/components/ui/toast-provider"
import { GlobalErrorListener } from "@/components/global-error-listener"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#080c14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.elitefund.sbs"),
  title: {
    default: "EliteFund | Funded Trading Accounts & Prop Trading",
    template: "%s | EliteFund",
  },
  description: "Explore EliteFund funded trading accounts, evaluation programs, trading rules, and risk-aware tools for disciplined forex and multi-asset traders.",
  alternates: {
    canonical: "https://www.elitefund.sbs/",
  },
  applicationName: "EliteFund",
  creator: "EliteFund",
  publisher: "EliteFund",
  category: "finance",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elite Fund",
    startupImage: "/elite-fund-logo.jpg",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    url: "https://www.elitefund.sbs/",
    siteName: "EliteFund",
    title: "EliteFund | Funded Trading Accounts & Prop Trading",
    description: "Explore funded trading programs, clear rules, and risk-aware tools for disciplined traders.",
    images: [{ url: "/elite-fund-logo.jpg", width: 1200, height: 630, alt: "EliteFund logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EliteFund | Funded Trading Accounts & Prop Trading",
    description: "Explore funded trading programs, clear rules, and risk-aware tools for disciplined traders.",
    images: ["/elite-fund-logo.jpg"],
  },
  icons: {
    icon: [{ url: "/elite-fund-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/elite-fund-logo.jpg", type: "image/jpeg" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Elite Fund" />
        <meta name="application-name" content="Elite Fund" />
        <meta name="msapplication-TileColor" content="#080c14" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="icon" href="/elite-fund-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/elite-fund-logo.jpg" />
      </head>
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "EliteFund",
              url: "https://www.elitefund.sbs/",
              logo: "https://www.elitefund.sbs/elite-fund-logo.jpg",
              description: "Funded trading programs and risk-aware tools for disciplined traders.",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "EliteFund",
              url: "https://www.elitefund.sbs/",
            }),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="elite-fund-theme">
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
            <Toaster />
            <GlobalErrorListener />
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
        {/* Remove legacy service workers so cached HTML cannot diverge from the current server render. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) { registration.unregister(); });
                });
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    keys.forEach(function(key) { caches.delete(key); });
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
