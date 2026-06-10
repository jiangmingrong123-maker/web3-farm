import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="min-h-screen bg-ink text-white antialiased">
        {children}
      </body>
    </html>
  );
}
