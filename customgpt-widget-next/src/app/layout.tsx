import type { Metadata } from 'next';
import '../styles/design-tokens.css';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'CustomGPT Widget',
  description: 'Voice-enabled AI assistant with chat interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (process.env.NEXT_PUBLIC_THEME as 'dark' | 'light') || 'dark';

  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
