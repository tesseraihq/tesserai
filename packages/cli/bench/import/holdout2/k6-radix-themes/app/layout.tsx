import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Theme } from "@radix-ui/themes";

import "@radix-ui/themes/styles.css";
import "./tidepool-palette.css";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Tidepool Console",
  description: "Fleet telemetry for Tidepool buoys",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Theme accentColor="teal" grayColor="gray" radius="large" panelBackground="solid">
            {children}
          </Theme>
        </ThemeProvider>
      </body>
    </html>
  );
}
