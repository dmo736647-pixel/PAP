import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PAP V1',
  description: 'Personal Autonomous Information Agent prototype',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
