import express from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, env } from "@/config/env";
import { healthRouter } from "@/routes/health.routes";
import { authRouter } from "@/routes/auth.routes";
import { productRouter } from "@/routes/product.routes";
import { chatRouter } from "@/routes/chat.routes";
import { orderRouter } from "@/routes/order.routes";
import { paymentRouter } from "@/routes/payment.routes";
import { merchantRouter } from "@/routes/merchant.routes";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";

/** Builds the Express app. Kept separate from index.ts so tests can import it without opening a port. */
export function createApp() {
  const app = express();

  // Behind Render/Railway's proxy, req.ip is the proxy unless this is set —
  // which would make every user share one rate-limit bucket.
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      // No Origin header = curl / server-to-server, which CORS doesn't apply to.
      origin: (origin, cb) => cb(null, !origin || corsOrigins.includes(origin)),
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/products", productRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/merchant", merchantRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
