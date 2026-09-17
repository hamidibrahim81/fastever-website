import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fastever.in"),

  title: "FASTever - Food, Grocery & Essentials Delivery",

  description:
    "FASTever delivers food, groceries and essentials to your doorstep. Fast, smart and premium delivery starting in Konni, Kerala.",

  keywords: [
    "FASTever",
    "FASTever delivery",
    "food delivery",
    "grocery delivery",
    "essentials delivery",
    "Konni delivery",
    "food delivery Konni",
    "grocery delivery Konni",
  ],

  authors: [{ name: "FASTever" }],
  creator: "FASTever",
  publisher: "FASTever",

  applicationName: "FASTever",

  verification: {
    google: "XO9QOh35i2xKvBLlWYTrH_akRWt2fdNc4iDV3ssM6RM",
  },

  alternates: {
    canonical: "https://www.fastever.in/",
  },

  openGraph: {
    type: "website",
    url: "https://www.fastever.in/",
    siteName: "FASTever",
    title: "FASTever - Food, Grocery & Essentials Delivery",
    description:
      "Get food, groceries and essentials delivered to your doorstep. FASTever — fast, smart and premium delivery starting in Konni, Kerala.",
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    title: "FASTever - Food, Grocery & Essentials Delivery",
    description:
      "Food, groceries and essentials delivered to your doorstep. Starting in Konni, Kerala.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}