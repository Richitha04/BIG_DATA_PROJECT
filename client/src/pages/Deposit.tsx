import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDeposit } from "@/hooks/use-banking";
import { api } from "@shared/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowDownLeft, DollarSign } from "lucide-react";

const schema = api.banking.deposit.input;

export default function Deposit() {
  const depositMutation = useDeposit();
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, description: "" },
  });

  function onSubmit(data: z.infer<typeof schema>) {
    depositMutation.mutate(data, {
      onSuccess: () => form.reset(),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900">Deposit Funds</h1>
        <p className="text-muted-foreground mt-1">Add money to your account securely.</p>
      </div>

      <Card className="border-none shadow-soft">
        <CardHeader className="bg-slate-50 border-b pb-6">
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <CardTitle>New Deposit</CardTitle>
          <CardDescription>Enter the amount you wish to deposit.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Salary, Refund" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                disabled={depositMutation.isPending}
              >
                {depositMutation.isPending ? "Processing..." : "Confirm Deposit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
