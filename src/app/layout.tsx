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

const dexaPro = localFont({
  src: "./fonts/Dexap.otf",
  variable: "--font-dexa",
});

const oggD = localFont({
  src: "./fonts/Ogg-Bold.otf",
  variable: "--font-ogg",
});
// Removing DexaPro font since the file is missing
// To fix this, either:
// 1. Add the DexaPro.ttf file to the fonts directory
// 2. Or remove references to the font if not needed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${mullerExtraBold.variable} ${avertaDemo.variable} ${dexaPro.variable} ${oggD.variable}`}
      >
        <PreLogo />
        {children}
      </body>
    </html>
  );
}
