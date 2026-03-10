import { Router, Request, Response, NextFunction } from "express";
import { getSession } from "./db";
import { syncAllToNeo4j } from "./sync";
import {
    detectCycles,
    detectCommunities,
    computeCentrality,
    computeFraudScores,
    getHighRiskUsers,
    getFraudRingGraph,
    getGraphStats,
} from "./fraud-detection";

const router = Router();

// ─────────────────────────────────────────────
// Middleware: all Neo4j routes require authentication
// ─────────────────────────────────────────────
router.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return res.sendStatus(401);
    }
    next();
});

// ─────────────────────────────────────────────
// POST /api/neo4j/sync — Sync MongoDB → Neo4j (admin only)
// ─────────────────────────────────────────────
router.post("/sync", async (req: Request, res: Response) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
    }

    try {
        const result = await syncAllToNeo4j();
        res.json({
            success: true,
            message: "Data synced to Neo4j successfully",
            synced: result,
        });
    } catch (error) {
        console.error("[neo4j-route] Sync error:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Sync failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/stats — Graph statistics
// ─────────────────────────────────────────────
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const stats = await getGraphStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("[neo4j-route] Stats error:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to get stats",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/cycles — Cycle detection
// ─────────────────────────────────────────────
router.get("/fraud/cycles", async (req: Request, res: Response) => {
    try {
        const minLength = parseInt(req.query.minLength as string) || 3;
        const maxLength = parseInt(req.query.maxLength as string) || 6;
        const limit = parseInt(req.query.limit as string) || 50;

        const cycles = await detectCycles(minLength, maxLength, limit);
        res.json({
            success: true,
            data: cycles,
            count: cycles.length,
        });
    } catch (error) {
        console.error("[neo4j-route] Cycle detection error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Cycle detection failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/communities — Community detection
// ─────────────────────────────────────────────
router.get("/fraud/communities", async (req: Request, res: Response) => {
    try {
        const minGroupSize = parseInt(req.query.minGroupSize as string) || 3;
        const communities = await detectCommunities(minGroupSize);
        res.json({
            success: true,
            data: communities,
            count: communities.length,
        });
    } catch (error) {
        console.error("[neo4j-route] Community detection error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Community detection failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/centrality — Centrality analysis
// ─────────────────────────────────────────────
router.get("/fraud/centrality", async (_req: Request, res: Response) => {
    try {
        const centrality = await computeCentrality();
        res.json({
            success: true,
            data: centrality,
            count: centrality.length,
        });
    } catch (error) {
        console.error("[neo4j-route] Centrality error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Centrality analysis failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/scores — Fraud scores for all users
// ─────────────────────────────────────────────
router.get("/fraud/scores", async (_req: Request, res: Response) => {
    try {
        const scores = await computeFraudScores();
        res.json({
            success: true,
            data: scores,
            count: scores.length,
        });
    } catch (error) {
        console.error("[neo4j-route] Fraud scores error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Fraud scoring failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/high-risk — High risk users only
// ─────────────────────────────────────────────
router.get("/fraud/high-risk", async (req: Request, res: Response) => {
    try {
        const threshold = parseFloat(req.query.threshold as string) || 0.5;
        const highRisk = await getHighRiskUsers(threshold);
        res.json({
            success: true,
            data: highRisk,
            count: highRisk.length,
            threshold,
        });
    } catch (error) {
        console.error("[neo4j-route] High risk error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "High risk query failed",
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/neo4j/fraud/graph — Full graph for visualization
// ─────────────────────────────────────────────
router.get("/fraud/graph", async (_req: Request, res: Response) => {
    try {
        const graph = await getFraudRingGraph();
        res.json({
            success: true,
            data: graph,
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
        });
    } catch (error) {
        console.error("[neo4j-route] Graph data error:", error);
        res.status(500).json({
            success: false,
            message:
                error instanceof Error ? error.message : "Graph query failed",
        });
    }
});

// ─────────────────────────────────────────────
// POST /api/neo4j/cql/execute — Execute raw Cypher queries
// ─────────────────────────────────────────────
router.post("/cql/execute", async (req: Request, res: Response) => {
    // Only allow admins to run raw queries for security
    if (!req.isAuthenticated() || !req.user || !(req.user as any).isAdmin) {
        return res.status(403).json({ success: false, message: "Unauthorized: Admin access required" });
    }

    const { query } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, message: "Query string is required" });
    }

    const session = getSession();
    try {
        const result = await session.run(query);
        
        // Format the Neo4j records into a simple array of objects for the frontend
        const data = result.records.map((record: any) => {
            const row: any = {};
            record.keys.forEach((key: string) => {
                const value = record.get(key);
                // Handle Neo4j Node/Relationship objects and numbers
                if (value && typeof value === 'object') {
                    if (value.properties) {
                        row[key] = value.properties; // Node or Relationship
                    } else if (value.low !== undefined && value.high !== undefined) {
                        row[key] = value.toNumber(); // Neo4j Integer
                    } else {
                        row[key] = value;
                    }
                } else {
                    row[key] = value;
                }
            });
            return row;
        });

        res.json({
            success: true,
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error("[neo4j-route] CQL execution error:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Query execution failed"
        });
    } finally {
        await session.close();
    }
});

export default router;
