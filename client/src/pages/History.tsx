import { useTransactions } from "@/hooks/use-banking";
import { Card } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Send, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const { data: transactions, isLoading, isError, error } = useTransactions();
  const [search, setSearch] = useState("");

  const list = Array.isArray(transactions) ? transactions : [];
  const filtered = list.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Transaction History</h1>
          <p className="text-muted-foreground mt-1">Complete record of your financial activity.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search transactions..."
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">From User</th>
                <th className="px-6 py-4">To User</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Could not load transactions. {error?.message ?? "Please try again."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    {list.length === 0
                      ? "No transactions yet. Deposits and transfers will appear here."
                      : "No transactions found matching your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((tx: any) => (
                  <tr key={tx.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{tx.id}</td>
                    <td className="px-6 py-4 font-medium capitalize flex items-center gap-3">
                      <TransactionIcon type={tx.type} />
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{tx.from_user || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{tx.to_user || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{tx.description || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.date), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${['deposit', 'transfer'].includes(tx.type) ? 'text-green-600' : 'text-slate-900'
                      }`}>
                      {['deposit', 'transfer'].includes(tx.type) ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(tx.amount))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TransactionIcon({ type }: { type: string }) {
  if (type === 'deposit') return <div className="p-2 rounded-full bg-green-100 text-green-600"><ArrowDownLeft className="w-4 h-4" /></div>;
  if (type === 'withdraw') return <div className="p-2 rounded-full bg-red-100 text-red-600"><ArrowUpRight className="w-4 h-4" /></div>;
  return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><Send className="w-4 h-4" /></div>;
}
