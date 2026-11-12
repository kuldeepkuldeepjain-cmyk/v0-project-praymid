import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ToastProvider } from "@/components/ui/toast-provider"
import { GlobalErrorListener } from "@/components/global-error-listener"
import { ErrorBoundary } from "@/components/error-boundary"
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_ORIGIN } from "@/lib/site-seo"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const viewport: Viewport = {
  themeColor: "#080e17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Funded Trading Challenges & Accounts | EliteFund",
    template: "%s | EliteFund",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "finance",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
    startupImage: "/elite-fund-logo.jpg",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Funded Trading Challenges & Accounts | EliteFund",
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_IMAGE, alt: "EliteFund trading workspace and funded account plans" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Funded Trading Challenges & Accounts | EliteFund",
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
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
        <meta name="msapplication-TileColor" content="#080e17" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="icon" href="/elite-fund-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/elite-fund-logo.jpg" />
      </head>
      <body className={`${inter.className} ${inter.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE_ORIGIN}/#organization`,
              name: SITE_NAME,
              alternateName: "Elite Fund",
              url: `${SITE_ORIGIN}/`,
              logo: `${SITE_ORIGIN}/elite-fund-logo.jpg`,
              description: SITE_DESCRIPTION,
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@elitefund.sbs",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_ORIGIN}/#website`,
              name: SITE_NAME,
              alternateName: "Elite Fund",
              url: `${SITE_ORIGIN}/`,
              inLanguage: "en",
              publisher: { "@id": `${SITE_ORIGIN}/#organization` },
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
        <Script
          id="gtag-data-layer"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
            `,
          }}
        />
        <Script
          id="google-tag-manager"
          src="https://www.googletagmanager.com/gtm.js?id=GTM-NQ324DZ5"
          strategy="afterInteractive"
        />
        {/* Remove legacy service workers so cached HTML cannot diverge from the current server render. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                try {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) { registration.unregister().catch(function() {}); });
                  }).catch(function() {});
                } catch (e) {}
                try {
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(key) { caches.delete(key).catch(function() {}); });
                    }).catch(function() {});
                  }
                } catch (e) {}
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
