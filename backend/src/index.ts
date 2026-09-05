import express from "express";
import cors from "cors";
import { env } from "@/config/env";
import { healthRouter } from "@/routes/health.routes";
import { productRouter } from "@/routes/product.routes";
import { chatRouter } from "@/routes/chat.routes";
import { orderRouter } from "@/routes/order.routes";
import { paymentRouter } from "@/routes/payment.routes";
import { merchantRouter } from "@/routes/merchant.routes";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/products", productRouter);
app.use("/api/chat", chatRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/merchant", merchantRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`AgentCart backend listening on http://localhost:${env.PORT}`);
});
