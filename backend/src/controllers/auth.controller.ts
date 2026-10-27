import { Request, Response } from "express";
import { loginSchema, registerSchema } from "@/validators/auth.validators";
import * as authService from "@/services/authService";
import { currentUser } from "@/middleware/auth";
import { parseOrThrow } from "@/utils/validate";

export async function register(req: Request, res: Response) {
  const input = parseOrThrow(registerSchema, req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const input = parseOrThrow(loginSchema, req.body);
  const result = await authService.login(input);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = currentUser(req);
  res.json({ user });
}
