import type { Metadata } from 'next';
import '../styles/design-tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'CustomGPT Widget',
  description: 'Voice-enabled AI assistant with chat interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
