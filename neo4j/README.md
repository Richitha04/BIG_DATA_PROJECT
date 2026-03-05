# Neo4j Fraud Ring Detection Module

## Overview

This module integrates **Neo4j graph database** into the banking application for **fraud ring detection**. It models users as graph nodes and transactions as edges, then uses graph algorithms (cycle detection, community detection, centrality analysis) to identify suspicious patterns.

## Prerequisites

- **Neo4j Desktop** installed and running ([download](https://neo4j.com/download/))
- A local database created in Neo4j Desktop (default: `neo4j` database)

## Setup

### 1. Configure Environment Variables

Add these to your `.env` file in the project root:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
```

> **Note:** When you first set up Neo4j Desktop, you create a password for the `neo4j` user. Use that password here.

### 2. Install Dependencies

```bash
npm install neo4j-driver
```

### 3. Start Neo4j

Open **Neo4j Desktop** → Start your database → Ensure it shows "Running" status.

### 4. Start the Application

```bash
npm run dev
```

The server will automatically:
- Connect to Neo4j
- Set up constraints & indexes
- Log the connection status

### 5. Sync Data from MongoDB → Neo4j

As an **admin user**, call:

```
POST /api/neo4j/sync
```

This upserts all MongoDB users and transactions into the Neo4j graph.

---

## API Endpoints

All endpoints require authentication. Prefix: `/api/neo4j`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/neo4j/sync` | POST | Admin | Sync MongoDB data → Neo4j |
| `/api/neo4j/stats` | GET | User | Graph statistics (node/edge counts) |
| `/api/neo4j/fraud/cycles` | GET | User | Detect circular transfer rings |
| `/api/neo4j/fraud/communities` | GET | User | Detect dense user communities |
| `/api/neo4j/fraud/centrality` | GET | User | Degree centrality per user |
| `/api/neo4j/fraud/scores` | GET | User | Fraud risk scores (0–1) for all users |
| `/api/neo4j/fraud/high-risk` | GET | User | Only users above risk threshold |
| `/api/neo4j/fraud/graph` | GET | User | Full graph data (nodes + edges) for visualization |

### Query Parameters

- **Cycles**: `?minLength=3&maxLength=6&limit=50`
- **Communities**: `?minGroupSize=3`
- **High Risk**: `?threshold=0.5`

---

## Fraud Score Formula

Each user receives a score from **0.0 to 1.0**:

```
Fraud Score = 0.3 × Centrality
            + 0.3 × Cycle Participation
            + 0.2 × Community Density
            + 0.2 × Transaction Frequency
```

| Risk Level | Score |
|---|---|
| 🔴 HIGH | > 0.8 |
| 🟠 MEDIUM | 0.5 – 0.8 |
| 🟢 LOW | < 0.5 |

---

## File Structure

```
neo4j/
├── db.ts               # Neo4j driver connection
├── setup.ts            # Schema constraints & indexes
├── sync.ts             # MongoDB → Neo4j data sync
├── fraud-detection.ts  # Core fraud analysis (Cypher queries)
├── routes.ts           # Express API routes
└── README.md           # This file
```

---

## Verifying in Neo4j Browser

After syncing, open **Neo4j Browser** (http://localhost:7474) and run:

```cypher
// See all nodes and relationships
MATCH (n) RETURN n

// See just users
MATCH (u:User) RETURN u

// See transfer graph
MATCH (a:User)-[t:TRANSFER]->(b:User) RETURN a, t, b

// Find cycles
MATCH p=(a:User)-[:TRANSFER*3..5]->(a) RETURN p LIMIT 10
```
