import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lab OS | Dental Workflow Management",
  description: "Advanced tracking and management system for dental laboratory continuity.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
