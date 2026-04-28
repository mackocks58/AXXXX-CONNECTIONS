import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Navbar />
      {children}
      <BottomNav />
    </div>
  );
}
