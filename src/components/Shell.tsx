import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";

  return (
    <div className="shell">
      <Navbar />
      <div className="search-container">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search movies or groups..." 
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              params.set("q", val);
            } else {
              params.delete("q");
            }
            setParams(params);
          }}
        />
      </div>
      {children}
      <BottomNav />
    </div>
  );
}
