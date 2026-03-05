import { getSession } from "./db";
import { getDb } from "../server/db";
import type { ManagedTransaction } from "neo4j-driver";

/**
 * Sync all users from MongoDB to Neo4j as (:User) nodes.
 * Uses MERGE (upsert) so it's safe to re-run.
 */
export async function syncUsersToNeo4j(): Promise<number> {
    const mongoDB = getDb();
    const users = await mongoDB.collection("users").find({}).toArray();
    const session = getSession();

    let count = 0;

    try {
        // Batch upsert all users in a single transaction
        await session.executeWrite(async (tx: ManagedTransaction) => {
            for (const user of users) {
                await tx.run(
                    `
          MERGE (u:User {userId: $userId})
          SET u.username     = $username,
              u.fullName     = $fullName,
              u.accountNumber = $accountNumber,
              u.balance       = $balance,
              u.isAdmin       = $isAdmin,
              u.createdAt     = datetime($createdAt)
          `,
                    {
                        userId: user.id,
                        username: user.username,
                        fullName: user.fullName,
                        accountNumber: user.accountNumber,
                        balance: user.balance || "0.00",
                        isAdmin: user.isAdmin || false,
                        createdAt: (user.createdAt instanceof Date
                            ? user.createdAt
                            : new Date(user.createdAt)
                        ).toISOString(),
                    }
                );
                count++;
            }
        });

        console.log(`[neo4j-sync] Synced ${count} users to Neo4j.`);
        return count;
    } catch (error) {
        console.error("[neo4j-sync] Error syncing users:", error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * Sync all transactions from MongoDB to Neo4j as [:TRANSFER] relationships.
 * Creates edges: (sender)-[:TRANSFER {amount, type, ...}]->(receiver)
 *
 * For deposits/withdrawals (no related user), a self-loop is created
 * so the node still participates in the graph with its activity recorded.
 */
export async function syncTransactionsToNeo4j(): Promise<number> {
    const mongoDB = getDb();
    const transactions = await mongoDB
        .collection("transactions")
        .find({})
        .toArray();
    const session = getSession();

    let count = 0;

    try {
        await session.executeWrite(async (tx: ManagedTransaction) => {
            for (const txn of transactions) {
                const txnId = txn.id || txn.transaction_id;
                const senderId = txn.userId;
                const receiverId = txn.relatedUserId || txn.userId; // self if no recipient

                await tx.run(
                    `
          MATCH (sender:User {userId: $senderId})
          MATCH (receiver:User {userId: $receiverId})
          MERGE (sender)-[t:TRANSFER {txId: $txId}]->(receiver)
          SET t.amount      = $amount,
              t.type        = $type,
              t.description = $description,
              t.fromUser    = $fromUser,
              t.toUser      = $toUser,
              t.date        = datetime($date)
          `,
                    {
                        senderId,
                        receiverId,
                        txId: txnId,
                        amount: Number(txn.amount || 0),
                        type: txn.type || "unknown",
                        description: txn.description || "",
                        fromUser: txn.from_user || "",
                        toUser: txn.to_user || "",
                        date: (txn.date instanceof Date
                            ? txn.date
                            : new Date(txn.date || Date.now())
                        ).toISOString(),
                    }
                );
                count++;
            }
        });

        console.log(`[neo4j-sync] Synced ${count} transactions to Neo4j.`);
        return count;
    } catch (error) {
        console.error("[neo4j-sync] Error syncing transactions:", error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * Full sync: users first, then transactions.
 */
export async function syncAllToNeo4j(): Promise<{
    users: number;
    transactions: number;
}> {
    const users = await syncUsersToNeo4j();
    const transactions = await syncTransactionsToNeo4j();
    return { users, transactions };
}
