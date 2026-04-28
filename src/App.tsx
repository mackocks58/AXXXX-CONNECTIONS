import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Home from "@/pages/Home";
import MovieGroupDetail from "@/pages/MovieGroupDetail";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Register from "@/pages/Register";
import Admin from "@/pages/Admin";
import PaymentHistory from "@/pages/PaymentHistory";
import Support from "@/pages/Support";
import PaymentReturn from "@/pages/PaymentReturn";
import PaymentCancel from "@/pages/PaymentCancel";
import Account from "@/pages/Account";
import Notifications from "@/pages/Notifications";
import Movies from "@/pages/Movies";
import Affiliate from "@/pages/Affiliate";
import LiveMatches from "@/pages/LiveMatches";
import { Shell } from "@/components/Shell";
import { GlobalFeatures } from "@/components/GlobalFeatures";

function AdminRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Shell>
        <p className="muted">Loading…</p>
      </Shell>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <GlobalFeatures />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/affiliate" element={<Affiliate />} />
        <Route path="/live" element={<LiveMatches />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payments" element={<PaymentHistory />} />
        <Route path="/support" element={<Support />} />
        <Route path="/account" element={<Account />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:groupId" element={<MovieGroupDetail />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
