
import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with banking details
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  accountNumber: text("account_number").notNull().unique(), // Generate this
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // The user who performed or received the transaction
  type: text("type").notNull(), // 'deposit', 'withdraw', 'transfer_in', 'transfer_out'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  relatedUserId: integer("related_user_id"), // For transfers, the other party
  date: timestamp("date").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  balance: true,
  accountNumber: true 
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  date: true 
});

// API Types
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;

export const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2).optional(), // Optional for login
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export const transferSchema = transactionSchema.extend({
  toAccountNumber: z.string(),
});
