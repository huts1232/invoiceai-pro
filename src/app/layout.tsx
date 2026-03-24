import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "InvoiceAI Pro — AI-powered invoice automation for busy professionals",
  description: "InvoiceAI Pro uses artificial intelligence to automatically generate, process, and manage invoices from receipts, emails, and business documents. Elim",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen bg-gray-50 antialiased">{children}</body></html>
}