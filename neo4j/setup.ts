import { getSession } from "./db";

/**
 * Create Neo4j constraints and indexes for the fraud detection graph.
 * Idempotent — safe to run multiple times.
 */
export async function setupNeo4jSchema(): Promise<void> {
    const session = getSession();

    try {
        console.log("[neo4j] Setting up schema (constraints & indexes)...");

        // Unique constraint on User.userId
        await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.userId IS UNIQUE
    `);

        // Index on User.accountNumber for fast lookups
        await session.run(`
      CREATE INDEX user_account_idx IF NOT EXISTS
      FOR (u:User) ON (u.accountNumber)
    `);

        // Index on User.username
        await session.run(`
      CREATE INDEX user_username_idx IF NOT EXISTS
      FOR (u:User) ON (u.username)
    `);

        // Index on Transaction relationship properties (Neo4j 5+)
        // This helps with date-range queries on transfers
        try {
            await session.run(`
        CREATE INDEX transfer_date_idx IF NOT EXISTS
        FOR ()-[t:TRANSFER]-() ON (t.date)
      `);
        } catch {
            // Relationship indexes not supported in all Neo4j editions
            console.log("[neo4j] Relationship property indexes not supported, skipping.");
        }

        console.log("[neo4j] Schema setup complete.");
    } catch (error) {
        console.error("[neo4j] Schema setup error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
