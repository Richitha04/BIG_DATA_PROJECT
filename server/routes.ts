
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { transactionSchema, transferSchema } from "@shared/schema";

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
        res.status(500).json({ message: "Internal server error" });
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
        amount: (-amount).toString(), // Store as negative for consistency or handle in UI? 
        // Ideally withdrawals are negative in balance calc, but positive in transaction record + type='withdraw'
        // Let's store positive amount in transaction record, logic handles sign based on type.
        // Actually storage.createTransaction takes string, let's keep it simple.
        description: description || 'Cash Withdrawal',
      });

      res.json(transaction);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
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
      const allUsers = await storage.getAllUsers();
      const recipient = allUsers.find(u => u.accountNumber === toAccountNumber);

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

      // Record sender transaction
      const senderTx = await storage.createTransaction({
        userId: sender.id,
        type: 'transfer_out',
        amount: (-amount).toString(),
        description: description || `Transfer to ${recipient.fullName}`,
        relatedUserId: recipient.id,
      });

      // Record recipient transaction
      await storage.createTransaction({
        userId: recipient.id,
        type: 'transfer_in',
        amount: amount.toString(),
        description: description || `Transfer from ${sender.fullName}`,
        relatedUserId: sender.id,
      });

      res.json(senderTx);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
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

  return httpServer;
}
