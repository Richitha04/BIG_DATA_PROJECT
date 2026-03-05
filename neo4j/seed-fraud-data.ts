/**
 * Seed script: Creates sample transactions that form fraud ring patterns.
 * Run while the server is running: npx tsx neo4j/seed-fraud-data.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import neo4j from "neo4j-driver";

const MONGO_URL = process.env.DATABASE_URL!;
const NEO4J_URI = process.env.NEO4J_URI || "bolt://127.0.0.1:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;

async function main() {
    // ── Connect to MongoDB ──
    const mongo = new MongoClient(MONGO_URL);
    await mongo.connect();
    const db = mongo.db();
    const usersCol = db.collection("users");
    const txCol = db.collection("transactions");

    console.log("📦 Connected to MongoDB");

    // ── Create extra users for the fraud ring ──
    const existingUsers = await usersCol.find({}).toArray();
    const lastId = Math.max(...existingUsers.map((u) => u.id || 0), 0);
    const lastTxId =
        (await txCol.findOne({}, { sort: { id: -1 } }))?.id || 0;

    // Fraud ring members (new accounts)
    const fraudUsers = [
        { username: "alex_ring", fullName: "Alex Morgan", accountNumber: "ACC2001" },
        { username: "bob_ring", fullName: "Bob Carter", accountNumber: "ACC2002" },
        { username: "charlie_ring", fullName: "Charlie Davis", accountNumber: "ACC2003" },
        { username: "diana_ring", fullName: "Diana Evans", accountNumber: "ACC2004" },
        { username: "eve_ring", fullName: "Eve Foster", accountNumber: "ACC2005" },
    ];

    let userId = lastId;
    const createdUsers: any[] = [];

    for (const fu of fraudUsers) {
        // Check if already exists
        const exists = await usersCol.findOne({ username: fu.username });
        if (exists) {
            createdUsers.push(exists);
            console.log(`  ⏭ User ${fu.username} already exists (id=${exists.id})`);
            continue;
        }

        userId++;
        const newUser = {
            id: userId,
            username: fu.username,
            password: "not-a-real-login", // These are data-only accounts
            fullName: fu.fullName,
            accountNumber: fu.accountNumber,
            balance: "10000.00",
            createdAt: new Date(),
            isAdmin: false,
        };
        await usersCol.insertOne(newUser as any);
        createdUsers.push(newUser);
        console.log(`  ✅ Created user: ${fu.fullName} (id=${userId})`);
    }

    // Also get existing real users
    const john = await usersCol.findOne({ username: "john_doe" });
    const jane = await usersCol.findOne({ username: "jane_smith" });

    // ── Create fraud ring transactions ──
    let txId = lastTxId;

    // Check if fraud data already seeded
    const existingFraudTx = await txCol.findOne({ description: /Fraud Ring/ });
    if (existingFraudTx) {
        console.log("\n⏭ Fraud transactions already seeded. Skipping to Neo4j sync...");
    } else {
        console.log("\n🔄 Creating fraud ring transactions...");

        // RING 1: A → B → C → D → E → A  (classic cycle)
        const ring1 = [
            { from: createdUsers[0], to: createdUsers[1], amount: 2500, desc: "Fraud Ring 1 - Payment" },
            { from: createdUsers[1], to: createdUsers[2], amount: 2400, desc: "Fraud Ring 1 - Transfer" },
            { from: createdUsers[2], to: createdUsers[3], amount: 2300, desc: "Fraud Ring 1 - Service" },
            { from: createdUsers[3], to: createdUsers[4], amount: 2200, desc: "Fraud Ring 1 - Refund" },
            { from: createdUsers[4], to: createdUsers[0], amount: 2100, desc: "Fraud Ring 1 - Return" },
        ];

        // RING 2: A → C → E → A  (shorter cycle)
        const ring2 = [
            { from: createdUsers[0], to: createdUsers[2], amount: 1500, desc: "Fraud Ring 2 - Payment" },
            { from: createdUsers[2], to: createdUsers[4], amount: 1400, desc: "Fraud Ring 2 - Forward" },
            { from: createdUsers[4], to: createdUsers[0], amount: 1300, desc: "Fraud Ring 2 - Close" },
        ];

        // SUSPICIOUS: Dense back-and-forth between B and D
        const backForth = [
            { from: createdUsers[1], to: createdUsers[3], amount: 800, desc: "Quick swap 1" },
            { from: createdUsers[3], to: createdUsers[1], amount: 750, desc: "Quick swap 2" },
            { from: createdUsers[1], to: createdUsers[3], amount: 900, desc: "Quick swap 3" },
            { from: createdUsers[3], to: createdUsers[1], amount: 850, desc: "Quick swap 4" },
        ];

        // LEGITIMATE-LOOKING: Real users involved with ring members
        const legitimate = john && jane ? [
            { from: john, to: createdUsers[0], amount: 500, desc: "Freelance payment" },
            { from: createdUsers[2], to: jane, amount: 300, desc: "Dinner split" },
            { from: jane, to: createdUsers[4], amount: 200, desc: "Gift" },
        ] : [];

        // Additional transfers between real users
        const realUserTx = john && jane ? [
            { from: john, to: jane, amount: 1000, desc: "Loan repayment" },
            { from: jane, to: john, amount: 500, desc: "Partial return" },
        ] : [];

        const allTransactions = [...ring1, ...ring2, ...backForth, ...legitimate, ...realUserTx];

        for (const tx of allTransactions) {
            txId++;
            const dayOffset = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);

            await txCol.insertOne({
                id: txId,
                transaction_id: txId,
                userId: tx.from.id,
                type: "transfer",
                from_user: tx.from.fullName,
                to_user: tx.to.fullName,
                amount: tx.amount,
                description: tx.desc,
                relatedUserId: tx.to.id,
                date: date,
            } as any);

            console.log(`  💸 ${tx.from.fullName} → ${tx.to.fullName}: $${tx.amount} (${tx.desc})`);
        }

        console.log(`\n✅ Created ${allTransactions.length} fraud ring transactions!`);
    }

    // ── Sync to Neo4j ──
    console.log("\n🔄 Syncing to Neo4j...");

    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    const session = driver.session();

    try {
        // Sync users
        const allUsers = await usersCol.find({}).toArray();
        for (const user of allUsers) {
            await session.run(
                `MERGE (u:User {userId: $userId})
         SET u.username = $username, u.fullName = $fullName,
             u.accountNumber = $accountNumber, u.balance = $balance,
             u.isAdmin = $isAdmin`,
                {
                    userId: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    accountNumber: user.accountNumber,
                    balance: user.balance || "0.00",
                    isAdmin: user.isAdmin || false,
                }
            );
        }
        console.log(`  ✅ Synced ${allUsers.length} users to Neo4j`);

        // Sync transactions
        const allTx = await txCol.find({}).toArray();
        let syncCount = 0;
        for (const txn of allTx) {
            const senderId = txn.userId;
            const receiverId = txn.relatedUserId || txn.userId;
            const txnId = txn.id || txn.transaction_id;

            await session.run(
                `MATCH (sender:User {userId: $senderId})
         MATCH (receiver:User {userId: $receiverId})
         MERGE (sender)-[t:TRANSFER {txId: $txId}]->(receiver)
         SET t.amount = $amount, t.type = $type,
             t.description = $description,
             t.fromUser = $fromUser, t.toUser = $toUser`,
                {
                    senderId,
                    receiverId,
                    txId: txnId,
                    amount: Number(txn.amount || 0),
                    type: txn.type || "transfer",
                    description: txn.description || "",
                    fromUser: txn.from_user || "",
                    toUser: txn.to_user || "",
                }
            );
            syncCount++;
        }
        console.log(`  ✅ Synced ${syncCount} transactions to Neo4j`);

        // Quick stats
        const stats = await session.run(`
      MATCH (u:User) WITH count(u) AS nodes
      MATCH ()-[t:TRANSFER]->() WITH nodes, count(t) AS edges
      RETURN nodes, edges
    `);
        const r = stats.records[0];
        console.log(`\n📊 Neo4j Graph: ${r.get("nodes")} nodes, ${r.get("edges")} edges`);

        console.log("\n🎉 Done! Now try these in Neo4j Desktop Query tool:");
        console.log("   MATCH (a)-[t:TRANSFER]->(b) RETURN a, t, b");
        console.log("   MATCH p=(a)-[:TRANSFER*3..5]->(a) RETURN p");

    } finally {
        await session.close();
        await driver.close();
    }

    await mongo.close();
}

main().catch(console.error);
