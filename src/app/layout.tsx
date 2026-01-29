import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Blood Panel Tracker',
  description: 'Visualize and compare your bloodwork results over time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
