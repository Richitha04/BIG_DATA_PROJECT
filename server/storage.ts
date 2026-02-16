
import { type User, type InsertUser, type Transaction } from "@shared/schema";
import { getDb } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";

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
    this.sessionStore = new MongoStore({
      mongoUrl: process.env.DATABASE_URL,
      touchAfter: 24 * 3600,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ id });
    return user as User | null || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ username });
    return user as User | null || undefined;
  }

  async createUser(insertUser: InsertUser & { accountNumber: string, isAdmin?: boolean }): Promise<User> {
    const db = getDb();
    const usersCollection = db.collection("users");

    // Get next id (simple counter approach)
    const lastUser = await usersCollection.findOne({}, { sort: { id: -1 } });
    const nextId = (lastUser?.id || 0) + 1;

    const newUser: User = {
      id: nextId,
      username: insertUser.username,
      password: insertUser.password,
      fullName: insertUser.fullName,
      accountNumber: insertUser.accountNumber,
      balance: "0.00",
      createdAt: new Date(),
      isAdmin: insertUser.isAdmin || false,
    };

    const result = await usersCollection.insertOne(newUser as any);
    return newUser;
  }

  async createTransaction(tx: {
    userId: number;
    type: string;
    amount: string;
    description?: string;
    relatedUserId?: number;
  }): Promise<Transaction> {
    const db = getDb();
    const transactionsCollection = db.collection("transactions");

    // Get next id
    const lastTransaction = await transactionsCollection.findOne({}, { sort: { id: -1 } });
    const nextId = (lastTransaction?.id || 0) + 1;

    const newTransaction: Transaction = {
      id: nextId,
      userId: tx.userId,
      type: tx.type as any,
      amount: tx.amount.toString(),
      description: tx.description,
      relatedUserId: tx.relatedUserId,
      date: new Date(),
    };

    await transactionsCollection.insertOne(newTransaction as any);
    return newTransaction;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    const db = getDb();
    const transactionsCollection = db.collection("transactions");
    const transactions = await transactionsCollection
      .find({ userId })
      .sort({ date: -1 })
      .toArray();
    return transactions as Transaction[];
  }

  async getAllTransactions(): Promise<(Transaction & { user: User })[]> {
    const db = getDb();
    const transactionsCollection = db.collection("transactions");
    const usersCollection = db.collection("users");

    const transactions = await transactionsCollection
      .find({})
      .sort({ date: -1 })
      .toArray();

    // Fetch user data for each transaction
    const result = await Promise.all(
      transactions.map(async (tx) => {
        const user = await usersCollection.findOne({ id: tx.userId });
        return { ...tx, user: user as User } as Transaction & { user: User };
      })
    );

    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const db = getDb();
    const usersCollection = db.collection("users");
    const users = await usersCollection
      .find({})
      .sort({ id: 1 })
      .toArray();
    return users as User[];
  }

  async updateUserBalance(userId: number, amount: string): Promise<User> {
    const db = getDb();
    const usersCollection = db.collection("users");

    // Get current user to find their current balance
    const user = await usersCollection.findOne({ id: userId });
    if (!user) throw new Error("User not found");

    // Calculate new balance (both are strings, so we parse and add)
    const currentBalance = parseFloat(user.balance || "0");
    const amountToAdd = parseFloat(amount);
    const newBalance = (currentBalance + amountToAdd).toFixed(2);

    // Update user balance
    const result = await usersCollection.findOneAndUpdate(
      { id: userId },
      { $set: { balance: newBalance } },
      { returnDocument: "after" }
    );

    if (!result || !result.value) throw new Error("User not found");
    return result.value as User;
  }
}

export const storage = new DatabaseStorage();
