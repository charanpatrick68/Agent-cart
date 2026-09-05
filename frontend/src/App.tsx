import { Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/customer/LandingPage";
import { ShopPage } from "@/pages/customer/ShopPage";
import { PaymentStatusPage } from "@/pages/customer/PaymentStatusPage";
import { MerchantDashboardPage } from "@/pages/merchant/MerchantDashboardPage";
import { MerchantOrdersPage } from "@/pages/merchant/MerchantOrdersPage";
import { MerchantActivityPage } from "@/pages/merchant/MerchantActivityPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/payment/:orderId" element={<PaymentStatusPage />} />
      <Route path="/merchant" element={<MerchantDashboardPage />} />
      <Route path="/merchant/orders" element={<MerchantOrdersPage />} />
      <Route path="/merchant/activity" element={<MerchantActivityPage />} />
    </Routes>
  );
}

export default App;
