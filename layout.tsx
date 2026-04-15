import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import type { Metadata } from "next"
import { Analytics } from "@/components/analytics"
import { ErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "FlowChain - Connect & Grow",
  description: "Join the FlowChain community and start earning rewards",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="dark">
            {children}
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
