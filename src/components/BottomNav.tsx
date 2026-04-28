import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function linkCls({ isActive }: { isActive: boolean }) {
  return isActive ? "dock-item active" : "dock-item";
}

export function BottomNav() {
  const { user } = useAuth();

  return (
    <div className="bottom-dock-container">
      <nav className="bottom-dock">
        <NavLink to="/" className={linkCls} end>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Home</span>
        </NavLink>
        
        {user && (
          <>

            <NavLink to="/payments" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              <span>Wallet</span>
            </NavLink>
            <NavLink to="/betslips" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Betslips</span>
            </NavLink>
            <NavLink to="/account" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Profile</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}
