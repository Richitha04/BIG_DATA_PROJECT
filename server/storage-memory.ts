
import { type User, type InsertUser, type Transaction } from "@shared/schema";
import session from "express-session";
import MemoryStoreConstructor from "memorystore";

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
  getAllTransactions(): Promise<(Transaction & { user: User })[]>;
  getAllUsers(): Promise<User[]>;

  updateUserBalance(userId: number, amount: string): Promise<User>;

  sessionStore: session.Store;
}

const MemoryStore = MemoryStoreConstructor(session);

export class InMemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private transactions: Map<number, Transaction> = new Map();
  private nextUserId = 1;
  private nextTransactionId = 1;
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({});
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser & { accountNumber: string, isAdmin?: boolean }): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username: insertUser.username,
      password: insertUser.password,
      fullName: insertUser.fullName,
      accountNumber: insertUser.accountNumber,
      balance: "0.00",
      createdAt: new Date(),
      isAdmin: insertUser.isAdmin || false,
    };

    this.users.set(user.id, user);
    return user;
  }
async createTransaction(tx: {

  userId: number;
  type: string;
  amount: string;
  description?: string;
  relatedUserId?: number;

}): Promise<Transaction> {

  const user = await this.getUser(tx.userId);

  if (!user) throw new Error("User not found");

  // Default sender = logged in user
  let fromUser: string | null = user.fullName;

  let toUser: string | null = null;


  // Transfer case → find receiver

  if (tx.relatedUserId && tx.type === "transfer") {

    const relatedUser =
      await this.getUser(tx.relatedUserId);

    toUser =
      relatedUser?.fullName ?? null;

  }


  const transaction: any = {

    id: this.nextTransactionId++,

    userId: tx.userId,

    type: tx.type as any,

    from_user: fromUser,

    to_user: toUser,

    amount: tx.amount.toString(),

    description: tx.description,

    relatedUserId: tx.relatedUserId,

    date: new Date(),

  };


  this.transactions.set(

    transaction.id,

    transaction

  );

  return transaction;

}

  async getTransactions(userId: number): Promise<Transaction[]> {
    const userTransactions = Array.from(this.transactions.values())
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return userTransactions;
  }

  async getAllTransactions(): Promise<(Transaction & { user: User })[]> {
    const allTransactions = Array.from(this.transactions.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((tx) => ({
        ...tx,
        user: this.users.get(tx.userId)!,
      }));
    return allTransactions;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => a.id - b.id);
  }

  async updateUserBalance(userId: number, amount: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const currentBalance = parseFloat(user.balance || "0");
    const amountToAdd = parseFloat(amount);
    const newBalance = (currentBalance + amountToAdd).toFixed(2);

    const updatedUser: User = { ...user, balance: newBalance };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export const storage = new InMemoryStorage();
