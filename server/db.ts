console.log("DATABASE_URL =", process.env.DATABASE_URL);
import { MongoClient, Db } from "mongodb";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let mongoClient: MongoClient;
let db: Db;

export async function initializeDb() {
  mongoClient = new MongoClient(process.env.DATABASE_URL!);
  await mongoClient.connect();
  db = mongoClient.db();

  // Ensure indexes for collections (field names must match what we store: camelCase)
  try {
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    // Drop old wrong index if it exists (we store accountNumber, not account_number)
    try {
      await usersCollection.dropIndex("account_number_1");
    } catch {
      /* ignore */
    }
    await usersCollection.createIndex({ accountNumber: 1 }, { unique: true });

    const transactionsCollection = db.collection("transactions");
    await transactionsCollection.createIndex({ userId: 1 });
    await transactionsCollection.createIndex({ relatedUserId: 1 });
  } catch (error) {
    // Indexes might already exist, that's fine
    if ((error as any).code !== 48 && (error as any).code !== 85) {
      console.warn("Index creation warning:", error);
    }
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDb() first.");
  }
  return db;
}

export async function closeDb() {
  if (mongoClient) {
    await mongoClient.close();
  }
}
  