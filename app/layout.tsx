import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { AIProvider } from "./context/AIContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexios AI",
  description: "Your intelligent AI development environment",
};

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('nexios-theme');
    if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark');
    var style = localStorage.getItem('nexios-ui-style') || 'flat';
    document.documentElement.classList.add('ui-' + style);
    var pattern = localStorage.getItem('nexios-bg-pattern');
    if (pattern && pattern !== 'none') document.documentElement.classList.add('pattern-' + pattern);
  } catch(e) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('ui-flat');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AIProvider>
            {children}
          </AIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
