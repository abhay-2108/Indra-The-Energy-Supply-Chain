import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SimulationProvider } from "@/context/SimulationContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "INDRA - Energy Supply Chain Resilience Platform",
  description: "India's Multi-Agent AI Geospatial Digital Twin for Strategic Energy Security and Supply Chain Resilience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 dark">
      <body className="font-sans h-screen flex flex-row overflow-hidden">
        <SimulationProvider>
          {/* Fixed Navigation Sidebar */}
          <Sidebar />

          {/* Main Work Area */}
          <main className="flex-1 pl-64 h-screen flex flex-col bg-slate-950/20 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="glow-ambient w-96 h-96 bg-emerald-500/5 top-[-10%] right-[-10%]" />
            <div className="glow-ambient w-[450px] h-[450px] bg-indigo-500/5 bottom-[-15%] left-[20%]" />

            {/* Header Bar */}
            <Header />

            {/* Child Page Rendering Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
              {children}
            </div>
          </main>
        </SimulationProvider>
      </body>
    </html>
  );
}
