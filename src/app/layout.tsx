import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fryseboksen – litt mindre å huske", template: "%s | Fryseboksen" },
  description:
    "Se hva du har i fryseren. Legg til på få sekunder, og finn fram det som har ligget lengst.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb">
      <body>
        <a className="skip-link" href="#main" tabIndex={0}>
          Hopp til innhold
        </a>
        {children}
      </body>
    </html>
  );
}
