import neo4j, { Driver, Session } from "neo4j-driver";

// Default Neo4j Desktop credentials
const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "neo4j";

let driver: Driver | null = null;

/**
 * Initialize the Neo4j driver. Call once at app startup.
 */
export function initNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
        logging: {
          level: "warn",
          logger: (level: string, message: string) =>
            console.log(`[neo4j-${level}] ${message}`),
        },
      }
    );
  }
  return driver;
}

/**
 * Get the Neo4j driver instance (must call initNeo4jDriver first).
 */
export function getDriver(): Driver {
  if (!driver) {
    throw new Error(
      "Neo4j driver not initialized. Call initNeo4jDriver() first."
    );
  }
  return driver;
}

/**
 * Open a new Neo4j session.
 */
export function getSession(database?: string): Session {
  const d = getDriver();
  return d.session({ database: database || "neo4j" });
}

/**
 * Verify connectivity to Neo4j.
 */
export async function verifyNeo4jConnection(): Promise<boolean> {
  try {
    const d = getDriver();
    const serverInfo = await d.getServerInfo();
    console.log(
      `[neo4j] Connected to Neo4j ${serverInfo.protocolVersion} at ${NEO4J_URI}`
    );
    return true;
  } catch (error) {
    console.error(
      "[neo4j] Failed to connect to Neo4j:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Close the Neo4j driver (call on shutdown).
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log("[neo4j] Driver closed.");
  }
}
