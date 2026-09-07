import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ten-k-pushup-challenge.yuevan10284.chatgpt.site"),
  title: "10K Pushup Challenge",
  description: "Track 10,000 pushups in 30 days and compete with your crew.",
  openGraph: {
    title: "10K Pushup Challenge",
    description: "30 days. 10,000 reps. Track your progress and compete with the crew.",
    url: "/",
    siteName: "10K Pushup Challenge",
    images: [{ url: "/og.png", width: 1744, height: 912, alt: "10K Pushup Challenge — 30 days, 10,000 reps" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "10K Pushup Challenge",
    description: "30 days. 10,000 reps. Track your progress and compete with the crew.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
