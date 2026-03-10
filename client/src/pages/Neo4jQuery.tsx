import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Network, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface Neo4jQueryResult {
  success: boolean;
  data?: any;
  count?: number;
  nodeCount?: number;
  edgeCount?: number;
  threshold?: number;
  error?: string;
}

export default function Neo4jQuery() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Neo4jQueryResult | null>(null);
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
      // TODO: Replace with actual Neo4j CQL execution endpoint
      // This is a dummy API call for demonstration - friends can change later
      const response = await fetch("/api/neo4j/cql/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryString }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to execute Neo4j query");
      }

      return response.json();
    },
    onSuccess: (data, endpoint) => {
      setResult({
        success: true,
        data: data.data,
        count: data.count,
        nodeCount: data.nodeCount,
        edgeCount: data.edgeCount,
        threshold: data.threshold,
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

  const cqlExamples = [
    // Basic Banking Queries
    {
      label: "Get All Users",
      query: "MATCH (u:User) RETURN u",
      description: "Retrieve all user nodes"
    },
    {
      label: "Get All Transactions",
      query: "MATCH (t:Transaction) RETURN t",
      description: "Retrieve all transaction nodes"
    },
    {
      label: "Count All Users",
      query: "MATCH (u:User) RETURN count(u) AS totalUsers",
      description: "Count total number of users"
    },
    {
      label: "Count All Transactions",
      query: "MATCH (t:Transaction) RETURN count(t) AS totalTransactions",
      description: "Count total number of transactions"
    },

    // Transaction Type Queries
    {
      label: "Find All Deposits",
      query: "MATCH (t:Transaction {type: 'deposit'}) RETURN t",
      description: "Find all deposit transactions"
    },
    {
      label: "Find All Withdrawals",
      query: "MATCH (t:Transaction {type: 'withdraw'}) RETURN t",
      description: "Find all withdrawal transactions"
    },
    {
      label: "Find All Transfers",
      query: "MATCH (t:Transaction {type: 'transfer'}) RETURN t",
      description: "Find all transfer transactions"
    },
    {
      label: "High Value Transactions",
      query: "MATCH (t:Transaction) WHERE t.amount > 1000 RETURN t",
      description: "Find transactions over $1000"
    },

    // Relationship Queries
    {
      label: "Get All Transfer Relationships",
      query: "MATCH ()-[r:TRANSFER]->() RETURN r",
      description: "Retrieve all transfer relationships"
    },
    {
      label: "User Transfer Connections",
      query: "MATCH (a:User)-[r:TRANSFER]->(b:User) RETURN a.fullName AS fromUser, b.fullName AS toUser, r.amount",
      description: "Find users connected by transfers"
    },
    {
      label: "User's Outgoing Transfers",
      query: "MATCH (u:User {fullName: 'John Doe'})-[r:TRANSFER]->(recipient:User) RETURN recipient.fullName, r.amount, r.date",
      description: "Find transfers sent by specific user"
    },
    {
      label: "User's Incoming Transfers",
      query: "MATCH (u:User {fullName: 'John Doe'})<-[r:TRANSFER]-(sender:User) RETURN sender.fullName, r.amount, r.date",
      description: "Find transfers received by specific user"
    },

    // Analytics Queries
    {
      label: "Count Transactions Per User",
      query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, count(r) AS transactionCount",
      description: "Count number of transfers per user"
    },
    {
      label: "Total Amount Transferred Per User",
      query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, sum(r.amount) AS totalTransferred",
      description: "Calculate total amount transferred by each user"
    },
    {
      label: "Users With Most Transactions",
      query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, count(r) AS transactionCount ORDER BY transactionCount DESC LIMIT 5",
      description: "Find top 5 users with most transfers"
    },
    {
      label: "Largest Transfer Amounts",
      query: "MATCH ()-[r:TRANSFER]->() RETURN r.amount ORDER BY r.amount DESC LIMIT 10",
      description: "Find top 10 largest transfer amounts"
    },

    // Date-based Queries
    {
      label: "Recent Transactions",
      query: "MATCH (t:Transaction) WHERE t.date >= date('2024-01-01') RETURN t ORDER BY t.date DESC LIMIT 20",
      description: "Get recent transactions from 2024"
    },
    {
      label: "Transactions This Month",
      query: "MATCH (t:Transaction) WHERE t.date >= date() - duration({days: 30}) RETURN t",
      description: "Get transactions from last 30 days"
    },
    {
      label: "Transactions by Date Range",
      query: "MATCH (t:Transaction) WHERE t.date >= date('2024-01-01') AND t.date <= date('2024-12-31') RETURN t",
      description: "Get transactions within date range"
    },

    // Advanced Banking Analytics
    {
      label: "Find Suspicious Circular Transfers",
      query: "MATCH (u:User)-[r1:TRANSFER]->(middle:User)-[r2:TRANSFER]->(final:User) WHERE u <> final RETURN u.fullName, middle.fullName, final.fullName, r1.amount, r2.amount",
      description: "Detect circular transfer patterns (potential fraud)"
    },
    {
      label: "Users With High Frequency Transfers",
      query: "MATCH (u:User)-[r:TRANSFER]->() WITH u, date(r.date) AS transferDate, count(r) AS dailyCount WHERE dailyCount > 3 RETURN u.fullName, transferDate, dailyCount",
      description: "Find users with multiple transfers in same day"
    },
    {
      label: "Round Number Transfers (Suspicious)",
      query: "MATCH ()-[r:TRANSFER]->() WHERE r.amount % 1000 = 0 RETURN r ORDER BY r.amount DESC",
      description: "Find transfers with round thousand amounts (potentially suspicious)"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">Neo4j Query</h1>
        <p className="text-muted-foreground mt-1">
          Execute Neo4j CQL queries for graph database operations and fraud detection exercises.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Query Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Graph Query Builder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Neo4j CQL Query
                  </label>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., MATCH (n) RETURN n"
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

          {/* CQL Query Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Neo4j CQL Query Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {cqlExamples.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full gap-3 h-auto p-4 justify-start"
                    onClick={() => setQuery(item.query)}
                  >
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                    </div>
                  </Button>
                ))}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.count !== undefined && (
                      <Badge variant="secondary">
                        {result.count} {result.count === 1 ? "result" : "results"}
                      </Badge>
                    )}
                    {result.nodeCount && (
                      <Badge variant="outline">
                        {result.nodeCount} nodes
                      </Badge>
                    )}
                    {result.edgeCount && (
                      <Badge variant="outline">
                        {result.edgeCount} edges
                      </Badge>
                    )}
                    {result.threshold !== undefined && (
                      <Badge variant="outline">
                        Threshold: {result.threshold}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {result.success ? (
                  result.data ? (
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
