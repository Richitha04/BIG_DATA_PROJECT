
import { type User, type InsertUser, type Transaction } from "@shared/schema";
import { getDb } from "./db";
import session from "express-session";
import MongoStore from "connect-mongo";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAccountNumber(accountNumber: string): Promise<User | undefined>;
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

  async getUserByAccountNumber(accountNumber: string): Promise<User | undefined> {
    const db = getDb();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ accountNumber });
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

    // Get user info for from_user and to_user
    const user = await this.getUser(tx.userId);
    let fromUser = user?.fullName;
    let toUser = null;

    if (tx.relatedUserId && (tx.type === 'transfer_out' || tx.type === 'transfer_in')) {
      const relatedUser = await this.getUser(tx.relatedUserId);
      if (tx.type === 'transfer_out') {
        toUser = relatedUser?.fullName;
      } else {
        fromUser = relatedUser?.fullName;
        toUser = user?.fullName;
      }
    }

    const newTransaction: Transaction = {
      id: nextId,
      userId: tx.userId,
      type: tx.type as any,
      amount: tx.amount.toString(),
      description: tx.description,
      relatedUserId: tx.relatedUserId,
      date: new Date(),
    };

    // Include transaction_id for DB unique index (avoids E11000 when field was null for all docs)
    await transactionsCollection.insertOne({
      ...newTransaction,
      transaction_id: nextId,
      from_user: fromUser,
      to_user: toUser,
    } as any);
    return newTransaction;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    const db = getDb();
    const transactionsCollection = db.collection("transactions");
    // Coerce to number so session/deserialize string doesn't cause no-match (MongoDB type-sensitive)
    const uid = Number(userId);
    const transactions = await transactionsCollection
      .find({ userId: uid })
      .sort({ date: -1 })
      .toArray();
    // Return plain serializable objects (id, userId, type, amount, description, relatedUserId, date)
    return transactions.map((doc: any) => ({
      id: doc.id,
      userId: doc.userId,
      type: doc.type,
      from_user: doc.from_user,
      to_user: doc.to_user,
      amount: String(doc.amount ?? "0"),
      description: doc.description,
      relatedUserId: doc.relatedUserId,
      date: doc.date instanceof Date ? doc.date.toISOString() : doc.date,
    })) as Transaction[];
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
    // MongoDB Node Driver 6+ returns the document directly (not { value: document })
    const updated = await usersCollection.findOneAndUpdate(
      { id: userId },
      { $set: { balance: newBalance } },
      { returnDocument: "after" }
    );

    if (!updated) throw new Error("User not found");
    return updated as User;
  }
}

export const storage = new DatabaseStorage();
