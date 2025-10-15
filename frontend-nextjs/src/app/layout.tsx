import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { MainLayout } from '@/components/layout/MainLayout'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LMMS-Eval Dashboard',
  description: 'A comprehensive dashboard for Large Multimodal Model evaluation and benchmarking',
  keywords: ['LMM', 'evaluation', 'benchmarking', 'AI', 'machine learning'],
  authors: [{ name: 'LMMS-Eval Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'LMMS-Eval Dashboard',
    description: 'A comprehensive dashboard for Large Multimodal Model evaluation and benchmarking',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMMS-Eval Dashboard',
    description: 'A comprehensive dashboard for Large Multimodal Model evaluation and benchmarking',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
