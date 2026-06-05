import type { Metadata } from "next"
import { Inter, IBM_Plex_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PageTransition } from "@/components/motion/PageTransition"
import "./globals.css"
import "./styles.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Fadhil CareDesk � Repair Operations",
  description: "Autopilot repair workflow for Fadhil Computer Shop",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body>
        <TooltipProvider>
          <PageTransition>{children}</PageTransition>
        </TooltipProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  )
}
