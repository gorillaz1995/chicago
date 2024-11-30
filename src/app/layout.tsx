import localFont from "next/font/local";
import "./globals.css";
import PreLogo from "./components/PreLogo";

// Load Muller ExtraBold font
const mullerExtraBold = localFont({
  src: "./fonts/Muller-ExtraBold-DEMO.ttf",
  variable: "--font-muller", // Creates CSS variable for use in Tailwind
});

// Load Averta Demo font
const avertaDemo = localFont({
  src: "./fonts/AvertaDemoPECuttedDemo-Regular.otf",
  variable: "--font-averta", // Creates CSS variable for use in Tailwind
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mullerExtraBold.variable} ${avertaDemo.variable}`}>
        <PreLogo />
        {children}
      </body>
    </html>
  );
}
