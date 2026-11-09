import type { Metadata, Viewport } from "next"
import { Albert_Sans, Gloock } from "next/font/google"
import "./globals.css"

const albert = Albert_Sans({ subsets: ["latin"], variable: "--font-albert", display: "swap" })
const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" })

export const metadata: Metadata = {
  title: "MomentCap",
  description: "Shared photo and video capture for your event.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#21182a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${albert.variable} ${gloock.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
