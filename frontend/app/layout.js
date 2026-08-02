import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata = {
  title: 'NyayaSahayak — DM Court AI System',
  description: 'AI-Assisted District Magistrate Court Order System for Bihar. Evidence-grounded, rule-aware draft order assistant.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
