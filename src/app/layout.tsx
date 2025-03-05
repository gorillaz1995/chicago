import localFont from "next/font/local";
import "./globals.css";
import PreLogo from "./components/PreLogo";

const oggD = localFont({
  src: "./fonts/Ogg-Bold.otf",
  variable: "--font-ogg",
});

const geistSans = localFont({
  src: "./fonts/Geist-VariableFont_wght.ttf",
  variable: "--font-geist",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${oggD.variable} ${geistSans.variable}`}>
        <PreLogo />
        {children}
      </body>
    </html>
  );
}
