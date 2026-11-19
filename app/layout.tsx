import type { Metadata, Viewport } from "next";
import { Noto_Nastaliq_Urdu, Outfit } from "next/font/google";
import "./globals.css";

const urdu = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://saath-parenting-coach.vercel.app"),
  title: "Saath: a parenting coach for parents, in English and Urdu",
  description: "Type what is going on with your child and get a short, safe plan, with a check-in that comes back.",
  openGraph: {
    title: "Saath: a parenting coach for parents, in English and Urdu",
    description: "A short, safe plan for today, and a check-in that comes back.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${urdu.variable}`} suppressHydrationWarning>
      <head>
        {/* the first screen enters once on load; without script it simply stands */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
