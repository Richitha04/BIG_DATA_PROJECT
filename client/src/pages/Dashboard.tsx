import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-banking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowDownLeft, ArrowUpRight, Send, Wallet, TrendingUp, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions();

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(user?.balance || 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your accounts and recent activity.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/deposit">
            <Button className="gap-2 shadow-md shadow-primary/20">
              <ArrowDownLeft className="w-4 h-4" /> Deposit
            </Button>
          </Link>
          <Link href="/transfer">
            <Button variant="secondary" className="gap-2">
              <Send className="w-4 h-4" /> Transfer
            </Button>
          </Link>
          <Link href="/query">
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" /> Query
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-2xl shadow-blue-900/20">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-64 h-64">
              <path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-medium mb-1">Total Balance</p>
                <h2 className="text-5xl font-bold tracking-tight font-display">{formattedBalance}</h2>
              </div>
              <div className="bg-white/10 backdrop-blur px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                Checking Account
              </div>
            </div>

            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold mb-1">Account Number</p>
                <p className="font-mono text-xl tracking-widest">{user?.accountNumber}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold mb-1">Account Holder</p>
                <p className="font-medium text-lg">{user?.fullName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats / Info */}
        <div className="grid grid-rows-2 gap-6">
          <Card className="border-none shadow-soft hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">+$0.00</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-soft hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending</p>
                <p className="text-2xl font-bold text-orange-600">$0.00</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
          <Link href="/history" className="text-primary hover:underline text-sm font-medium">View All</Link>
        </div>

        <Card className="border-none shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : transactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No transactions found. Start by making a deposit!
                    </td>
                  </tr>
                ) : (
                  transactions?.slice(0, 5).map((tx: any) => (
                    <tr key={tx.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium capitalize flex items-center gap-3">
                        <TransactionIcon type={tx.type} />
                        {tx.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{tx.description || "No description"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{format(new Date(tx.date), "MMM d, yyyy")}</td>
                      <td className={`px-6 py-4 text-right font-medium ${['deposit', 'transfer'].includes(tx.type) ? 'text-green-600' : 'text-slate-900'
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

    </div>
  );
}

function TransactionIcon({ type }: { type: string }) {
  if (type === 'deposit') return <div className="p-2 rounded-full bg-green-100 text-green-600"><ArrowDownLeft className="w-4 h-4" /></div>;
  if (type === 'withdraw') return <div className="p-2 rounded-full bg-red-100 text-red-600"><ArrowUpRight className="w-4 h-4" /></div>;
  return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><Send className="w-4 h-4" /></div>;
}
