import "./globals.css";

export const metadata = {
  title: "QG do Escritório",
  description: "Jonas Inácio · Advocacia Previdenciária",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
