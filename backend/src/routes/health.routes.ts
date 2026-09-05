import { Router } from "express";
import { prisma } from "@/config/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let dbStatus: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  res.json({
    status: "ok",
    time: new Date().toISOString(),
    db: dbStatus,
  });
});
