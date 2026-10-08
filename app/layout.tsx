import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Intotum Projetos", template: "%s · Intotum Projetos" },
  description: "Acompanhamento de implantações da Intotum",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
