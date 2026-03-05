import { getSession } from "./db";
import neo4j from "neo4j-driver";
import type { Record as Neo4jRecord } from "neo4j-driver";

// ─────────────────────────────────────────────
// 1. CYCLE DETECTION  (Fraud Rings)
// ─────────────────────────────────────────────

/**
 * Detects circular money transfer paths of length 3–6.
 * A→B→C→A is a cycle of length 3.
 */
export async function detectCycles(
    minLength = 3,
    maxLength = 6,
    limit = 50
): Promise<any[]> {
    const session = getSession();
    try {
        const result = await session.run(
            `
      MATCH path = (start:User)-[:TRANSFER*${minLength}..${maxLength}]->(start)
      WHERE ALL(n IN nodes(path) WHERE n:User)
      WITH path,
           [n IN nodes(path) | n.fullName] AS members,
           [r IN relationships(path) | r.amount] AS amounts,
           length(path) AS cycleLength
      RETURN members,
             amounts,
             cycleLength,
             reduce(total = 0.0, a IN amounts | total + a) AS totalAmount
      ORDER BY cycleLength DESC
      LIMIT ${Math.floor(Number(limit))}
      `
        );

        return result.records.map((r: Neo4jRecord) => ({
            members: r.get("members"),
            amounts: r.get("amounts"),
            cycleLength: r.get("cycleLength")?.toNumber?.() ?? r.get("cycleLength"),
            totalAmount: r.get("totalAmount"),
        }));
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────
// 2. COMMUNITY DETECTION  (Dense Groups)
// ─────────────────────────────────────────────

/**
 * Detects tightly connected groups using weakly connected components.
 * Works without the GDS plugin.
 * Groups with ≥ 3 members AND high internal transfer counts are suspicious.
 */
export async function detectCommunities(
    minGroupSize = 3
): Promise<any[]> {
    const session = getSession();
    try {
        // Find connected components by traversal
        const result = await session.run(
            `
      MATCH (u:User)
      WITH collect(u) AS allUsers
      UNWIND allUsers AS startNode
      MATCH path = (startNode)-[:TRANSFER*1..5]-(connected:User)
      WITH startNode,
           collect(DISTINCT connected) + [startNode] AS community
      WITH community,
           size(community) AS groupSize
      WHERE groupSize >= $minGroupSize
      WITH community, groupSize
      ORDER BY groupSize DESC
      LIMIT 20
      UNWIND community AS member
      WITH community, groupSize,
           collect(DISTINCT member.fullName) AS memberNames,
           collect(DISTINCT member.userId) AS memberIds
      RETURN memberNames, memberIds, groupSize
      `,
            { minGroupSize: Number(minGroupSize) }
        );

        return result.records.map((r: Neo4jRecord) => ({
            memberNames: r.get("memberNames"),
            memberIds: r.get("memberIds"),
            groupSize: r.get("groupSize")?.toNumber?.() ?? r.get("groupSize"),
        }));
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────
// 3. CENTRALITY ANALYSIS  (Kingpin Detection)
// ─────────────────────────────────────────────

/**
 * Computes degree centrality for each user.
 * High degree = many connections = potential money mule or kingpin.
 */
export async function computeCentrality(): Promise<any[]> {
    const session = getSession();
    try {
        const result = await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[out:TRANSFER]->()
      OPTIONAL MATCH ()-[inc:TRANSFER]->(u)
      WITH u,
           count(DISTINCT out) AS outDegree,
           count(DISTINCT inc) AS inDegree,
           count(DISTINCT out) + count(DISTINCT inc) AS totalDegree
      OPTIONAL MATCH (u)-[r:TRANSFER]->()
      WITH u, outDegree, inDegree, totalDegree,
           sum(r.amount) AS totalSent
      OPTIONAL MATCH ()-[r2:TRANSFER]->(u)
      WITH u, outDegree, inDegree, totalDegree, totalSent,
           sum(r2.amount) AS totalReceived
      RETURN u.userId       AS userId,
             u.fullName     AS fullName,
             u.accountNumber AS accountNumber,
             outDegree,
             inDegree,
             totalDegree,
             COALESCE(totalSent, 0.0)     AS totalSent,
             COALESCE(totalReceived, 0.0) AS totalReceived
      ORDER BY totalDegree DESC
    `);

        return result.records.map((r: Neo4jRecord) => ({
            userId: r.get("userId")?.toNumber?.() ?? r.get("userId"),
            fullName: r.get("fullName"),
            accountNumber: r.get("accountNumber"),
            outDegree: r.get("outDegree")?.toNumber?.() ?? r.get("outDegree"),
            inDegree: r.get("inDegree")?.toNumber?.() ?? r.get("inDegree"),
            totalDegree: r.get("totalDegree")?.toNumber?.() ?? r.get("totalDegree"),
            totalSent: r.get("totalSent"),
            totalReceived: r.get("totalReceived"),
        }));
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────
// 4. FRAUD SCORE COMPUTATION
// ─────────────────────────────────────────────

/**
 * Computes a fraud risk score (0–1) for each user based on:
 *   0.3 × normalized Centrality
 * + 0.3 × Cycle Participation (boolean)
 * + 0.2 × Community Density
 * + 0.2 × Transaction Frequency
 *
 * Returns all users sorted by fraud score descending.
 */
export async function computeFraudScores(): Promise<any[]> {
    const session = getSession();
    try {
        const result = await session.run(`
      // 1) Degree centrality per user
      MATCH (u:User)
      OPTIONAL MATCH (u)-[r:TRANSFER]-()
      WITH u, count(r) AS degree

      // 2) Max degree for normalization
      WITH collect({user: u, degree: degree}) AS userData,
           max(degree) AS maxDegree

      UNWIND userData AS ud
      WITH ud.user AS u,
           ud.degree AS degree,
           CASE WHEN maxDegree > 0
                THEN toFloat(ud.degree) / maxDegree
                ELSE 0.0 END AS normalizedCentrality

      // 3) Cycle participation: does this user appear in any cycle (length 3-5)?
      OPTIONAL MATCH cyclePath = (u)-[:TRANSFER*3..5]->(u)
      WITH u, normalizedCentrality, degree,
           CASE WHEN cyclePath IS NOT NULL THEN 1.0 ELSE 0.0 END AS cycleScore

      // 4) Transaction frequency (outgoing transfers count)
      OPTIONAL MATCH (u)-[out:TRANSFER]->()
      WITH u, normalizedCentrality,
           max(cycleScore) AS cycleScore,
           degree,
           count(out) AS txCount

      // 5) Normalize tx frequency
      WITH collect({
             user: u,
             centralityScore: normalizedCentrality,
             cycleScore: cycleScore,
             degree: degree,
             txCount: txCount
           }) AS allData,
           max(txCount) AS maxTx

      UNWIND allData AS d
      WITH d.user AS u,
           d.centralityScore AS centralityScore,
           d.cycleScore AS cycleScore,
           d.degree AS degree,
           CASE WHEN maxTx > 0
                THEN toFloat(d.txCount) / maxTx
                ELSE 0.0 END AS txFreqScore

      // 6) Community density approximation
      //    (ratio of actual connections to possible connections among neighbors)
      OPTIONAL MATCH (u)-[:TRANSFER]-(neighbor:User)
      WITH u, centralityScore, cycleScore, txFreqScore, degree,
           collect(DISTINCT neighbor) AS neighbors

      OPTIONAL MATCH (n1)-[:TRANSFER]-(n2)
      WHERE n1 IN neighbors AND n2 IN neighbors AND id(n1) < id(n2)
      WITH u, centralityScore, cycleScore, txFreqScore, degree,
           size(neighbors) AS neighborCount,
           count(DISTINCT n2) AS internalEdges

      WITH u, centralityScore, cycleScore, txFreqScore, degree,
           CASE WHEN neighborCount > 1
                THEN toFloat(internalEdges) /
                     (toFloat(neighborCount) * (neighborCount - 1) / 2)
                ELSE 0.0 END AS communityDensity

      // 7) Final weighted fraud score
      WITH u,
           centralityScore,
           cycleScore,
           communityDensity,
           txFreqScore,
           degree,
           (0.3 * centralityScore +
            0.3 * cycleScore +
            0.2 * communityDensity +
            0.2 * txFreqScore) AS fraudScore

      RETURN u.userId        AS userId,
             u.fullName      AS fullName,
             u.accountNumber AS accountNumber,
             round(centralityScore * 1000) / 1000  AS centralityScore,
             cycleScore,
             round(communityDensity * 1000) / 1000 AS communityDensity,
             round(txFreqScore * 1000) / 1000      AS txFreqScore,
             round(fraudScore * 1000) / 1000        AS fraudScore,
             CASE
               WHEN fraudScore > 0.8 THEN 'HIGH'
               WHEN fraudScore > 0.5 THEN 'MEDIUM'
               ELSE 'LOW'
             END AS riskLevel,
             degree
      ORDER BY fraudScore DESC
    `);

        return result.records.map((r: Neo4jRecord) => ({
            userId: r.get("userId")?.toNumber?.() ?? r.get("userId"),
            fullName: r.get("fullName"),
            accountNumber: r.get("accountNumber"),
            centralityScore: r.get("centralityScore"),
            cycleScore: r.get("cycleScore"),
            communityDensity: r.get("communityDensity"),
            txFreqScore: r.get("txFreqScore"),
            fraudScore: r.get("fraudScore"),
            riskLevel: r.get("riskLevel"),
            degree: r.get("degree")?.toNumber?.() ?? r.get("degree"),
        }));
    } finally {
        await session.close();
    }
}

/**
 * Get only high-risk users (fraud score > threshold).
 */
export async function getHighRiskUsers(
    threshold = 0.5
): Promise<any[]> {
    const allScores = await computeFraudScores();
    return allScores.filter((u) => u.fraudScore >= threshold);
}

// ─────────────────────────────────────────────
// 5. GRAPH DATA FOR VISUALIZATION
// ─────────────────────────────────────────────

/**
 * Returns all nodes and edges for frontend graph visualization.
 */
export async function getFraudRingGraph(): Promise<{
    nodes: any[];
    edges: any[];
}> {
    const session = getSession();
    try {
        // Get nodes
        const nodesResult = await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[r:TRANSFER]-()
      WITH u, count(r) AS degree
      RETURN u.userId        AS id,
             u.fullName      AS label,
             u.accountNumber AS accountNumber,
             u.balance       AS balance,
             u.isAdmin       AS isAdmin,
             degree
      ORDER BY degree DESC
    `);

        const nodes = nodesResult.records.map((r: Neo4jRecord) => ({
            id: r.get("id")?.toNumber?.() ?? r.get("id"),
            label: r.get("label"),
            accountNumber: r.get("accountNumber"),
            balance: r.get("balance"),
            isAdmin: r.get("isAdmin"),
            degree: r.get("degree")?.toNumber?.() ?? r.get("degree"),
        }));

        // Get edges
        const edgesResult = await session.run(`
      MATCH (a:User)-[t:TRANSFER]->(b:User)
      RETURN a.userId AS source,
             b.userId AS target,
             t.amount AS amount,
             t.type   AS type,
             t.description AS description,
             t.date   AS date,
             t.txId   AS txId
    `);

        const edges = edgesResult.records.map((r: Neo4jRecord) => ({
            source: r.get("source")?.toNumber?.() ?? r.get("source"),
            target: r.get("target")?.toNumber?.() ?? r.get("target"),
            amount: r.get("amount"),
            type: r.get("type"),
            description: r.get("description"),
            date: r.get("date"),
            txId: r.get("txId")?.toNumber?.() ?? r.get("txId"),
        }));

        return { nodes, edges };
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────
// 6. GRAPH STATS
// ─────────────────────────────────────────────

/**
 * Returns basic graph statistics.
 */
export async function getGraphStats(): Promise<{
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
}> {
    const session = getSession();
    try {
        const result = await session.run(`
      MATCH (u:User)
      OPTIONAL MATCH ()-[t:TRANSFER]->()
      WITH count(DISTINCT u) AS nodeCount,
           count(DISTINCT t) AS edgeCount
      RETURN nodeCount, edgeCount,
             CASE WHEN nodeCount > 0
                  THEN round(toFloat(edgeCount) / nodeCount * 100) / 100
                  ELSE 0.0
             END AS avgDegree
    `);

        const record = result.records[0];
        return {
            nodeCount:
                record.get("nodeCount")?.toNumber?.() ?? record.get("nodeCount"),
            edgeCount:
                record.get("edgeCount")?.toNumber?.() ?? record.get("edgeCount"),
            avgDegree: record.get("avgDegree"),
        };
    } finally {
        await session.close();
    }
}
