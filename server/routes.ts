
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { transactionSchema, transferSchema, type User } from "@shared/schema";
import { api } from "@shared/routes";
import { getDb } from "./db";

import { storage } from "./storage";

// Augment Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      fullName: string;
      accountNumber: string;
      balance: string;
      createdAt: Date;
      isAdmin: boolean;
    }
  }
}


export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Set up authentication middleware and routes
  setupAuth(app);

  // === Banking Operations ===

  // Deposit
  app.post(api.banking.deposit.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { amount, description } = api.banking.deposit.input.parse(req.body);
      
      // Update balance
      await storage.updateUserBalance(req.user.id, amount.toString());
      
      // Record transaction
      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: 'deposit',
        amount: amount.toString(),
        description: description || 'Cash Deposit',
      });
      
      res.json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Deposit error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
      }
    }
  });

  // Withdraw
  app.post(api.banking.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { amount, description } = api.banking.withdraw.input.parse(req.body);
      
      // Check sufficient funds
      const user = await storage.getUser(req.user.id);
      if (!user || parseFloat(user.balance) < amount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Update balance (negative amount)
      await storage.updateUserBalance(req.user.id, (-amount).toString());

      // Record transaction
      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: 'withdraw',
        amount: amount.toString(), // Store as positive, type indicates it's a withdrawal
        description: description || 'Cash Withdrawal',
      });

      res.json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Withdraw error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
      }
    }
  });

  // Transfer
  app.post(api.banking.transfer.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { amount, toAccountNumber, description } = api.banking.transfer.input.parse(req.body);

      // Check sufficient funds
      const sender = await storage.getUser(req.user.id);
      if (!sender || parseFloat(sender.balance) < amount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Find recipient (simulate finding by account number)
      // We need a method to find by account number, using getAllUsers for now or add method
      // Ideally storage should have getUserByAccountNumber
      const recipient = await storage.getUserByAccountNumber(toAccountNumber);    

      if (!recipient) {
        return res.status(400).json({ message: "Recipient account not found" });
      }

      if (recipient.id === sender.id) {
        return res.status(400).json({ message: "Cannot transfer to self" });
      }

      // Deduct from sender
      await storage.updateUserBalance(sender.id, (-amount).toString());
      
      // Add to recipient
      await storage.updateUserBalance(recipient.id, amount.toString());

      // Record ONE transaction only

    const senderTx =
    await storage.createTransaction({

      userId: sender.id,

      type:'transfer',

      amount: amount.toString(),

      description:
      description ||
      `Transfer to ${recipient.fullName}`,

      relatedUserId:
      recipient.id,

  });

res.json(senderTx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Transfer error:", err);
        res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
      }
    }
  });

  // Get Transactions
  app.get(api.banking.transactions.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const txs = await storage.getTransactions(req.user.id);
    res.json(txs);
  });

  // Admin Routes
  app.get(api.admin.users.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get(api.admin.transactions.path, async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    const txs = await storage.getAllTransactions();
    res.json(txs);
  });

  // Seed Data
  if ((await storage.getAllUsers()).length === 0) {
    console.log("Seeding database...");
    const adminPassword = await hashPassword("password123");
    const adminUser = await storage.createUser({
      username: "admin",
      password: adminPassword,
      fullName: "Bank Administrator",
      accountNumber: "ADM001",
      isAdmin: true,
    });
    
    // Create regular user
    const user1Password = await hashPassword("password123");
    const user1 = await storage.createUser({
      username: "john_doe",
      password: user1Password,
      fullName: "John Doe",
      accountNumber: "ACC1001",
      isAdmin: false,
    });

    // Initial deposit
    await storage.updateUserBalance(user1.id, "5000.00");
    await storage.createTransaction({
      userId: user1.id,
      type: "deposit",
      amount: "5000.00",
      description: "Initial Deposit",
    });

     // Create another user
    const user2Password = await hashPassword("password123");
    const user2 = await storage.createUser({
      username: "jane_smith",
      password: user2Password,
      fullName: "Jane Smith",
      accountNumber: "ACC1002",
      isAdmin: false,
    });
    
    await storage.updateUserBalance(user2.id, "1000.00");
    await storage.createTransaction({
      userId: user2.id,
      type: "deposit",
      amount: "1000.00",
      description: "Initial Deposit",
    });

    console.log("Database seeded!");
  }

app.post("/api/transactions/query/custom", async (req, res) => {

  if (!req.isAuthenticated())
    return res.sendStatus(401);

  try {

    const db = getDb();

    const collection =
      db.collection("transactions");

    let { query } = req.body;

    if (!query)
      return res.status(400).json({

        success:false,

        error:"Query required"

      });

    query = query.trim();

    let filter:any = {};

    let limit = 50;

    let sort:any = null;

    let skip = 0;


    // =====================
    // FIND FILTER
    // =====================

    const findMatch =
      query.match(/find\s*\(([\s\S]*?)\)/);

    if(findMatch){

      let filterString =
        findMatch[1].trim();

      filter =
        filterString
          ? eval("("+filterString+")")   // allow mongo style object
          : {};

    }

    else{

      filter =
        eval("("+query+")");

    }


    // =====================
    // LIMIT
    // =====================

    const limitMatch =
      query.match(/limit\s*\((\d+)\)/);

    if(limitMatch)
      limit =
        parseInt(limitMatch[1]);


    // =====================
    // SKIP
    // =====================

    const skipMatch =
      query.match(/skip\s*\((\d+)\)/);

    if(skipMatch)
      skip =
        parseInt(skipMatch[1]);


    // =====================
    // SORT
    // =====================

    const sortMatch =
      query.match(/sort\s*\(([\s\S]*?)\)/);

    if(sortMatch){

      sort =
        eval("("+sortMatch[1]+")");

    }


    // =====================
    // Execute
    // =====================

    let cursor =
      collection.find(filter);

    if(sort){

  const sortField =
    Object.keys(sort)[0];

  const direction =
    sort[sortField];

  // numeric sort using aggregation

  const results =
    await collection.aggregate([

      { $match: filter },

      {
        $addFields:{
          numericAmount:{
            $toDouble:"$amount"
          }
        }
      },

      {
        $sort:{
          [sortField === "amount"
            ? "numericAmount"
            : sortField
          ]:direction
        }
      },

      { $skip: skip },

      { $limit: limit }

    ]).toArray();

  return res.json({

    success:true,

    data:results,

    count:results.length

  });

}

    if(skip)
      cursor =
        cursor.skip(skip);

    cursor =
      cursor.limit(limit);


    const results =
      await cursor.toArray();

    res.json({

      success:true,

      data:results,

      count:results.length

    });

  }

  catch(error){

    console.error(error);

    res.status(400).json({

      success:false,

      error:
        error instanceof Error
          ? error.message
          :"Cannot execute query"

    });

  }

});
  return httpServer;
}
