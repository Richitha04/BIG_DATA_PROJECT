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
    mutationFn: async (endpoint: string) => {
      const response = await fetch(`/api/neo4j${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
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
    {
      label: "Get All Nodes",
      query: "MATCH (n) RETURN n",
      description: "Retrieve all nodes in the graph"
    },
    {
      label: "Get All Users",
      query: "MATCH (u:User) RETURN u",
      description: "Retrieve all user nodes"
    },
    {
      label: "Count All Nodes",
      query: "MATCH (n) RETURN count(n) AS totalNodes",
      description: "Count total number of nodes"
    },
    {
      label: "Find All Relationships",
      query: "MATCH ()-[r]->() RETURN r",
      description: "Retrieve all relationships"
    },
    {
      label: "Get Transfer Relationships",
      query: "MATCH ()-[t:TRANSFER]->() RETURN t",
      description: "Retrieve all transfer relationships"
    },
    {
      label: "Find User Connections",
      query: "MATCH (a:User)-[r:TRANSFER]->(b:User) RETURN a, r, b",
      description: "Find users connected by transfers"
    },
    {
      label: "Count User Transactions",
      query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, count(r) AS transactions",
      description: "Count transactions per user"
    },
    {
      label: "Find High Value Transfers",
      query: "MATCH ()-[t:TRANSFER]->() WHERE t.amount > 1000 RETURN t",
      description: "Find transfers over $1000"
    },
    {
      label: "Simple Path Detection",
      query: "MATCH p=(a:User)-[:TRANSFER*2..3]->(b:User) RETURN p LIMIT 10",
      description: "Find paths of 2-3 transfers"
    },
    {
      label: "Order by Amount",
      query: "MATCH ()-[t:TRANSFER]->() RETURN t.amount ORDER BY t.amount DESC",
      description: "Order transfers by amount (high to low)"
    },
    {
      label: "Limit Results",
      query: "MATCH (u:User) RETURN u LIMIT 5",
      description: "Get only 5 users"
    },
    {
      label: "Skip and Limit",
      query: "MATCH (u:User) RETURN u SKIP 2 LIMIT 3",
      description: "Skip 2 users, get next 3"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">Neo4j Query</h1>
        <p className="text-muted-foreground mt-1">
          Execute Neo4j graph queries for fraud detection and network analysis.
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
