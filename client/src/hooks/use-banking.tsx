import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// --- TRANSACTIONS ---

export function useTransactions() {
  return useQuery({
    queryKey: [api.banking.transactions.path],
    queryFn: async () => {
      const res = await fetch(api.banking.transactions.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.banking.transactions.responses[200].parse(await res.json());
    },
  });
}

// --- ACTIONS (Deposit, Withdraw, Transfer) ---

export function useDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.banking.deposit.input>) => {
      const res = await fetch(api.banking.deposit.path, {
        method: api.banking.deposit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Deposit failed");
      }
      return api.banking.deposit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banking.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // Update balance
      toast({ title: "Deposit Successful", description: "Funds have been added to your account." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Deposit Failed", description: err.message });
    }
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.banking.withdraw.input>) => {
      const res = await fetch(api.banking.withdraw.path, {
        method: api.banking.withdraw.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Withdrawal failed");
      }
      return api.banking.withdraw.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banking.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "Withdrawal Successful", description: "Funds have been deducted." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: err.message });
    }
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.banking.transfer.input>) => {
      const res = await fetch(api.banking.transfer.path, {
        method: api.banking.transfer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Transfer failed");
      }
      return api.banking.transfer.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banking.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "Transfer Successful", description: "Money has been sent." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Transfer Failed", description: err.message });
    }
  });
}

// --- ADMIN ---

export function useAdminUsers() {
  return useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const res = await fetch(api.admin.users.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.admin.users.responses[200].parse(await res.json());
    },
  });
}

export function useAdminTransactions() {
  return useQuery({
    queryKey: [api.admin.transactions.path],
    queryFn: async () => {
      const res = await fetch(api.admin.transactions.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.admin.transactions.responses[200].parse(await res.json());
    },
  });
}
