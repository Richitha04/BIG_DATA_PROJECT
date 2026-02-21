import { useAdminUsers, useAdminTransactions } from "@/hooks/use-banking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Admin() {
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: transactions, isLoading: txLoading } = useAdminTransactions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">System-wide overview and management.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Account Number</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                    <th className="px-6 py-4 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    <SkeletonRows cols={6} />
                  ) : (
                    users?.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-muted-foreground">#{u.id}</td>
                        <td className="px-6 py-4 font-medium">{u.fullName}</td>
                        <td className="px-6 py-4">{u.username}</td>
                        <td className="px-6 py-4 font-mono">{u.accountNumber}</td>
                        <td className="px-6 py-4 text-right font-medium">
                          ${Number(u.balance).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
           <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>System Transactions</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {txLoading ? (
                    <SkeletonRows cols={5} />
                  ) : (
                    transactions?.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-muted-foreground">#{tx.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{tx.user?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{tx.user?.username}</div>
                        </td>
                        <td className="px-6 py-4 capitalize">{tx.type.replace('_', ' ')}</td>
                        <td className="px-6 py-4 font-medium">${Number(tx.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(tx.date), "MMM d, HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-6 py-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
