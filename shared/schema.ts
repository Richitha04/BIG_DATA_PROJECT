
import { z } from "zod";
import { ObjectId } from "mongodb";

// MongoDB Types
export interface User {
  _id?: ObjectId;
  id: number;
  username: string;
  password: string;
  fullName: string;
  accountNumber: string;
  balance: string; // Stored as string to maintain precision
  createdAt: Date;
  isAdmin: boolean;
}

export interface Transaction {
  _id?: ObjectId;
  id: number;
  userId: number;
  type: "deposit" | "withdraw" | "transfer";
  from_user?: string | null;
  to_user?: string | null;
  amount: string; // Stored as string to maintain precision
  description?: string;
  relatedUserId?: number;
  date: Date;
}

// Insert schemas (for creating new documents)
export const insertUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2),
  accountNumber: z.string(),
  isAdmin: z.boolean().optional().default(false),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertTransactionSchema = z.object({
  userId: z.number(),
  type: z.enum(["deposit", "withdraw", "transfer"]),
  amount: z.string(),
  description: z.string().optional(),
  relatedUserId: z.number().optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Validation Schemas
export const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2).optional(),
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export const transferSchema = transactionSchema.extend({
  toAccountNumber: z.string(),
});
