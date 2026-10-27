import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LandingPage } from "@/pages/customer/LandingPage";
import { ShopPage } from "@/pages/customer/ShopPage";
import { MyOrdersPage } from "@/pages/customer/MyOrdersPage";
import { PaymentStatusPage } from "@/pages/customer/PaymentStatusPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { MerchantDashboardPage } from "@/pages/merchant/MerchantDashboardPage";
import { MerchantOrdersPage } from "@/pages/merchant/MerchantOrdersPage";
import { MerchantActivityPage } from "@/pages/merchant/MerchantActivityPage";

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">404</p>
      <h1 className="mt-2 font-display text-2xl text-ink">Page not found</h1>
      <a href="/" className="mt-6 inline-block text-sm text-accent hover:underline">
        Back to home
      </a>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Any signed-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/payment/:orderId" element={<PaymentStatusPage />} />
      </Route>

      {/* Merchant accounts only */}
      <Route element={<ProtectedRoute role="MERCHANT" />}>
        <Route path="/merchant" element={<MerchantDashboardPage />} />
        <Route path="/merchant/orders" element={<MerchantOrdersPage />} />
        <Route path="/merchant/activity" element={<MerchantActivityPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
