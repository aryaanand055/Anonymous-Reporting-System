import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anonymous-reporting-system.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Anonymous Reporting',
    template: '%s | Anonymous Reporting',
  },
  description: 'A secure, privacy-first anonymous incident reporting platform.',
  applicationName: 'Anonymous Reporting',
  authors: [{ name: 'Arya' }],
  creator: 'Arya',
  publisher: 'Arya',
  keywords: [
    'anonymous reporting',
    'privacy',
    'incident reporting',
    'civic trust',
    'secure reporting',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Anonymous Reporting',
    title: 'Anonymous Reporting',
    description: 'Speak without fear with a privacy-first reporting platform built for secure civic response.',
    images: [
      {
        url: '/p1.png',
        width: 1200,
        height: 630,
        alt: 'Anonymous Reporting social preview image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anonymous Reporting',
    description: 'Privacy-first anonymous reporting with a premium, trust-centered interface.',
    images: ['/p1.png'],
  },
  icons: {
    icon: [
      { url: '/p2.png?v=2', type: 'image/png' },
    ],
    shortcut: '/p2.png?v=2',
    apple: '/p2.png?v=2',
  },
  themeColor: '#08111f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="author" content="Arya" />
        <meta name="theme-color" content="#08111f" />
        <link rel="icon" href="/p2.png?v=2" type="image/png" />
        <link rel="shortcut icon" href="/p2.png?v=2" />
        <link rel="apple-touch-icon" href="/p2.png?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}