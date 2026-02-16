
import { users, transactions, type User, type InsertUser, type Transaction } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { accountNumber: string, isAdmin?: boolean }): Promise<User>;
  
  // Banking operations
  createTransaction(transaction: {
    userId: number;
    type: string;
    amount: string;
    description?: string;
    relatedUserId?: number;
  }): Promise<Transaction>;
  
  getTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<(Transaction & { user: User })[]>; // Admin
  getAllUsers(): Promise<User[]>; // Admin
  
  updateUserBalance(userId: number, amount: string): Promise<User>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { accountNumber: string, isAdmin?: boolean }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTransaction(tx: {
    userId: number;
    type: string;
    amount: string;
    description?: string;
    relatedUserId?: number;
  }): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values({
      ...tx,
      amount: tx.amount.toString(),
    }).returning();
    return transaction;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getAllTransactions(): Promise<(Transaction & { user: User })[]> {
    const result = await db.select({
      transaction: transactions,
      user: users
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.userId, users.id))
    .orderBy(desc(transactions.date));

    return result.map(r => ({ ...r.transaction, user: r.user }));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async updateUserBalance(userId: number, amount: string): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ 
        balance: sql`${users.balance} + ${amount}` 
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) throw new Error("User not found");
    return updatedUser;
  }
}

export const storage = new DatabaseStorage();
