import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  listProducts,
  getProduct,
  getProductInventory,
  listCategories,
} from "@/controllers/product.controller";

export const productRouter = Router();

// Registered before "/:id" even though the path shapes don't actually
// collide (this is two segments, "/:id" is one) — kept first for
// readability so it's obviously not swallowed by the param route below.
productRouter.get("/meta/categories", asyncHandler(listCategories));

productRouter.get("/", asyncHandler(listProducts));
productRouter.get("/:id", asyncHandler(getProduct));
productRouter.get("/:id/inventory", asyncHandler(getProductInventory));
