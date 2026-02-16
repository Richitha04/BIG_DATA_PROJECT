import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransfer } from "@/hooks/use-banking";
import { api } from "@shared/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send, DollarSign, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const schema = api.banking.transfer.input;

export default function Transfer() {
  const transferMutation = useTransfer();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, toAccountNumber: "", description: "" },
  });

  function onSubmit(data: z.infer<typeof schema>) {
    transferMutation.mutate(data, {
      onSuccess: () => form.reset(),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900">Transfer Money</h1>
        <p className="text-muted-foreground mt-1">Send money instantly to another Horizon Bank account.</p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg flex justify-between items-center border border-blue-100">
        <span className="font-medium">Available Balance</span>
        <span className="font-bold text-lg">${Number(user?.balance || 0).toFixed(2)}</span>
      </div>

      <Card className="border-none shadow-soft">
        <CardHeader className="bg-slate-50 border-b pb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
            <Send className="w-6 h-6" />
          </div>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>Recipient must have a valid account number.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="toAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Account Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input placeholder="Enter 10-digit account number" className="pl-10 h-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          step="0.01" 
                          className="pl-10 text-lg h-12" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="What's this for?" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending ? "Sending..." : "Send Money"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
