import { Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "@/middleware/errorHandler";
import {
  searchProductsQuerySchema,
  productIdParamSchema,
} from "@/validators/product.validators";
import * as catalogService from "@/services/catalogService";
import { checkInventory } from "@/services/inventoryService";

function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new AppError(400, message || "Invalid request", "VALIDATION_ERROR");
  }
  return parsed.data;
}

export async function listProducts(req: Request, res: Response) {
  const query = parseOrThrow(searchProductsQuerySchema, req.query);
  const result = await catalogService.searchProducts(query);
  res.json(result);
}

export async function getProduct(req: Request, res: Response) {
  const { id } = parseOrThrow(productIdParamSchema, req.params);
  const product = await catalogService.getProductById(id);
  res.json(product);
}

export async function getProductInventory(req: Request, res: Response) {
  const { id } = parseOrThrow(productIdParamSchema, req.params);
  const inventory = await checkInventory(id);
  res.json(inventory);
}

export async function listCategories(_req: Request, res: Response) {
  const categories = await catalogService.listCategories();
  res.json({ categories });
}
