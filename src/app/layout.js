import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// app/layout.tsx
export const metadata = {
  title: 'Home | FoodTrack',
  icons: {
    icon: '/logo.png', // or .png if using a PNG
  },
  description:
    'FoodTrack helps you stay consistent with your daily meal bookings. Track, earn badges, and build better food habits.',
  openGraph: {
    title: 'FoodTrack',
    description:
      'Track your daily meal bookings, earn badges, and stay on top of your food goals with FoodTrack.',
    url: 'https://food-track-nine.vercel.app/',
    siteName: 'FoodTrack',
    images: [
      {
        url: '/og_image.jpg',
        width: 1200,
        height: 630,
        alt: 'FoodTrack Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FoodTrack',
    description:
      'Track your meals and earn badges. FoodTrack keeps your food journey consistent and fun.',
    images: ['/og_image.jpg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
