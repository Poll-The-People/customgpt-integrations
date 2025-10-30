import type { Metadata } from 'next';
import '../styles/design-tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'CustomGPT Widget',
  description: 'Voice-enabled AI assistant with 3D avatar and chat interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Import map for TalkingHead library dependencies */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
