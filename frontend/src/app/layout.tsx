import './globals.css';
// import { Inter } from 'next/font/google'; // Comment this out

// const inter = Inter({ subsets: ['latin'] }); // Comment this out

export const metadata = {
  title: 'SubStudio',
  description: 'Automated video transcription and translation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* Remove inter.className from the body */}
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}