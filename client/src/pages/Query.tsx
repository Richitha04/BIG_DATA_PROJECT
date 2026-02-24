import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Database, AlertCircle, CheckCircle, Filter, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  count?: number;
}

export default function Query() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const queryParam = searchParams.get("query");
    if (queryParam) {
      try {
        const decodedQuery = decodeURIComponent(queryParam);
        setQuery(decodedQuery);
      } catch (error) {
        console.error("Failed to decode query parameter:", error);
      }
    }
  }, [searchParams]);

  const executeQuery = useMutation({
    mutationFn: async (queryString: string) => {
      const response = await fetch("/api/transactions/query/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryString }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute query");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setResult({
        success: true,
        data: data.data,
        count: data.count || data.data?.length || 0,
      });
    },
    onError: (error) => {
      setResult({
        success: false,
        error: error.message || "Unknown error occurred",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setResult(null);
    executeQuery.mutate(query);
  };

  const sampleQueries = [
    { label: "Find all transactions", query: "{}" },
    { label: "Find transactions > $1000", query: '{"amount": {"$gt": 1000}}' },
    { label: "Find deposits only", query: '{"type": "deposit"}' },
    { label: "Sort by amount (descending)", query: '{}', sort: '{"amount": -1}' },
    { label: "Limit to 5 results", query: '{}', limit: 5 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">MongoDB Query</h1>
        <p className="text-muted-foreground mt-1">
          Execute custom MongoDB queries against your transaction data.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Query Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Query Builder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    MongoDB Query (JSON format)
                  </label>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='e.g., {"amount": {"$gt": 1000}, "type": "deposit"}'
                    className="font-mono text-sm min-h-[120px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={!query.trim() || executeQuery.isPending}
                >
                  {executeQuery.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Execute Query
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 h-auto p-3"
                  onClick={() => setQuery("{}")}
                >
                  <Filter className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">All Transactions</div>
                    <div className="text-xs text-muted-foreground">View all records</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 h-auto p-3"
                  onClick={() => setQuery('{"amount": {"$gt": 1000}}')}
                >
                  <TrendingUp className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Large Amounts</div>
                    <div className="text-xs text-muted-foreground">&gt; $1,000</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 h-auto p-3"
                  onClick={() => setQuery('{"type": "deposit"}')}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Deposits Only</div>
                    <div className="text-xs text-muted-foreground">Income transactions</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 h-auto p-3"
                  onClick={() => setQuery('{"type": "withdraw"}')}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Withdrawals</div>
                    <div className="text-xs text-muted-foreground">Expense transactions</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Query Results
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Query Error
                    </>
                  )}
                </CardTitle>
                {result.success && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {result.count} {result.count === 1 ? "result" : "results"}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {result.success ? (
                  result.data && result.data.length > 0 ? (
                    <div className="space-y-4">
                      <div className="max-h-96 overflow-y-auto">
                        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No results found
                    </div>
                  )
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
