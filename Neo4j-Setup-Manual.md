# Neo4j Fraud Ring Detection - Setup & Query Guide 🚀

This document explains everything about the Neo4j Graph Database integration for your Big Data project. It tells you exactly **what is stored**, **how to set it up on any PC**, and **what Cypher queries to use for your viva/presentation**.

---

## 🏗️ 1. What is stored in Neo4j?

We use Neo4j to visualize and analyze user relationships (transfers) that are hard to spot in MongoDB. 
Neo4j stores information in two ways:
- **Nodes (Points):** Represent Bank Users. Every user has properties like `userId`, `fullName`, `accountNumber`, `balance`, `riskLevel` and `fraudScore`.
- **Edges (Lines):** Represent Transactions (`TRANSFER`). When User A sends money to User B, an arrow is drawn from A to B with properties like `amount`, `txId`, `fromUser`, and `toUser`.

Because of this graph structure, Neo4j makes it incredibly fast and easy to detect circular money flows (Fraud Rings) and Highly Central Users ("Kingpins").

---

## ⚙️ 2. How to Setup on ANY New System

If you are taking this project to your college lab or a friend's laptop, here is the complete checklist from zero to running.

### Step 1: Install Prerequisites
1. Download and install **Node.js** (LTS version) from nodejs.org.
2. Download and install **Neo4j Desktop** from neo4j.com.

### Step 2: Get the Code Ready
1. Copy the entire `BIG_DATA_PROJECT` folder to the new system.
2. Open the terminal (Command Prompt/PowerShell) inside the project folder.
3. Run this command to download all backend and frontend packages:
   ```bash
   npm install
   ```

### Step 3: Configure Neo4j Desktop
1. Open Neo4j Desktop and create a new **Project**.
2. Click **"Add -> Local DBMS"**.
3. Set the password strictly to `Veluuma2002` (this matches the code).
4. Click **Start** to run the database. Make sure it shows a green "Running" status.

### Step 4: Add the .env File
Ensure there is a file named exactly `.env` in the root of the project folder (next to `package.json`). It must contain:
```env
# Your MongoDB connection string:
DATABASE_URL=mongodb+srv://Gowtham:Veluuma2002@cluster0.snprrrt.mongodb.net/?appName=Cluster0
# Neo4j connections:
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=Veluuma2002
```

### Step 5: Start the App & Seed Fraud Data
1. Start the actual web server and frontend by running:
   ```bash
   npm run dev
   ```
2. **Crucial Step for Demo Demo:** You need the sample fraud rings (Circular transfers) to show the examiners. Open a *second* terminal window in the project folder and run:
   ```bash
   npx tsx neo4j/seed-fraud-data.ts
   ```
   *(This script will create fake users, simulate fraudulent money transfers between them, and automatically sync it all to Neo4j. You only need to run this once!)*

3. Now open `http://localhost:5000` in your browser. Log in as Admin (`admin` / `password123`) and you are ready to show the application.


---

## 🔍 3. Cypher Queries to use for Viva / Testing

Open the Neo4j Query tool / Browser and run these exact queries to impress your examiners.

### A. Show the Entire Graph
Shows all users and all money transfers between them.
```cypher
MATCH (u1:User)-[t:TRANSFER]->(u2:User)
RETURN u1, t, u2
```

### B. Detect Fraud Rings (Circular Flow)
This is the core feature. It finds loops where money goes out and comes back to the same person between 3 to 6 steps. (e.g., A -> B -> C -> A)
```cypher
MATCH path = (a:User)-[:TRANSFER*3..6]->(a)
RETURN path
```

### C. Find "Kingpins" (High Centrality Users)
Find the people who are involved in the maximum number of transactions.
```cypher
MATCH (u:User)
OPTIONAL MATCH (u)-[r:TRANSFER]-()
WITH u, count(r) AS degree
RETURN u.fullName, u.accountNumber, degree
ORDER BY degree DESC
```

---

## 🎨 4. How to Tag Users with Fraud Scores & Make it look Good

To categorize users as HIGH, MEDIUM, or LOW risk in your graph, **run this tagging query FIRST**:

```cypher
MATCH (u:User)
OPTIONAL MATCH (u)-[r:TRANSFER]-()
WITH u, count(r) AS degree
WITH collect({user: u, degree: degree}) AS userData, max(degree) AS maxDegree
UNWIND userData AS ud
WITH ud.user AS u, (toFloat(ud.degree) / CASE WHEN maxDegree > 0 THEN maxDegree ELSE 1 END) AS centralityScore
OPTIONAL MATCH (u)-[:TRANSFER*3..5]->(u)
WITH u, centralityScore, CASE WHEN count(*) > 0 THEN 1.0 ELSE 0.0 END AS cycleScore
WITH u, (0.5 * centralityScore + 0.5 * cycleScore) AS finalScore
SET u.fraudScore = round(finalScore * 100) / 100,
    u.riskLevel = CASE 
        WHEN finalScore > 0.8 THEN 'HIGH'
        WHEN finalScore > 0.4 THEN 'MEDIUM'
        ELSE 'LOW' 
    END
RETURN u.fullName, u.fraudScore, u.riskLevel
```

### Now, Filter by HIGH risk:
You can query only the dangerous users and their immediate connections:
```cypher
MATCH (u1:User)-[t:TRANSFER]->(u2:User)
WHERE u1.riskLevel = 'HIGH' OR u2.riskLevel = 'HIGH'
RETURN u1, t, u2
```

### Color the Graph!
1. Run `MATCH (n) RETURN n`
2. In the Results panel, click on the **( User )** bubble in the top legend.
3. In the panel that opens at the bottom, click the **Color option** (the circle icon).
4. Change "Color By" to **riskLevel**.
5. Manually pick colours (e.g., **Red** for HIGH, **Yellow** for MEDIUM, **Blue** for LOW).
6. Click the **Caption option** ('T' icon) and select **fullName** so their names appear on the circles.

---

## 🗑️ 5. Deleting Data
If you make a mistake and want to clear the Neo4j database completely:
```cypher
MATCH (n) DETACH DELETE n
```
*(You can then re-run the sync command from Step 3 to bring the data back).*
