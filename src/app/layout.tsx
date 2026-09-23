import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Workspace",
  description: "Process raw leads into researched, qualified, ready-to-act packages.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
