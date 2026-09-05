import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "message is required").max(2000),
  sessionId: z.string().trim().min(1).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
