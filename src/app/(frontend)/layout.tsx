import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import React from 'react'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

export const metadata: Metadata = {
  title: 'Editorial Tracker',
  description: 'Plan content from idea to published.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        {/* ERR-1: error toasts, bottom right (design-system §7). */}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
