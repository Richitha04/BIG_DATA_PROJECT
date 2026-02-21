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

  // Ensure indexes for collections
  try {
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ account_number: 1 }, { unique: true });

    const transactionsCollection = db.collection("transactions");
    await transactionsCollection.createIndex({ user_id: 1 });
    await transactionsCollection.createIndex({ related_user_id: 1 });
  } catch (error) {
    // Indexes might already exist, that's fine
    if ((error as any).code !== 48) {
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
  