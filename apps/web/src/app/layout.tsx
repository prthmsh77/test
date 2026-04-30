import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shikhar — Live Trek Tracking',
  description: "Track your loved one's trek live. No app required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
