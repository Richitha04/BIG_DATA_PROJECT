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

  // Basic Retrieval
  {
    label: "Get All Users",
    query: "MATCH (u:User) RETURN u",
    description: "Retrieve all users"
  },
  {
    label: "Get All Transactions",
    query: "MATCH (t:Transaction) RETURN t",
    description: "Retrieve all transactions"
  },

  // Relationship Queries
  {
    label: "Users Sending Transfers",
    query: "MATCH (u:User)-[:TRANSFER]->(r:User) RETURN u.fullName AS sender, r.fullName AS receiver",
    description: "Show transfer connections between users"
  },
  {
    label: "User Transfer Network",
    query: "MATCH (a:User)-[r:TRANSFER]->(b:User) RETURN a,r,b",
    description: "Visualize transfer graph between users"
  },

  // Filtering
  {
    label: "High Value Transfers",
    query: "MATCH ()-[r:TRANSFER]->() WHERE r.amount > 1000 RETURN r",
    description: "Find transfers above threshold"
  },

  // Aggregation
  {
    label: "Count Transfers Per User",
    query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, COUNT(r) AS transferCount",
    description: "Count number of transfers each user sent"
  },
  {
    label: "Total Amount Sent Per User",
    query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, SUM(r.amount) AS totalSent",
    description: "Calculate total amount transferred per user"
  },

  // Ordering
  {
    label: "Top Senders",
    query: "MATCH (u:User)-[r:TRANSFER]->() RETURN u.fullName, COUNT(r) AS transferCount ORDER BY transferCount DESC LIMIT 5",
    description: "Find users with most transfers"
  },
  {
    label: "Largest Transfers",
    query: "MATCH ()-[r:TRANSFER]->() RETURN r.amount ORDER BY r.amount DESC LIMIT 10",
    description: "Find highest transfer amounts"
  },

  // Pagination
  {
    label: "List Users Alphabetically",
    query: "MATCH (u:User) RETURN u.fullName ORDER BY u.fullName ASC",
    description: "Sort users alphabetically"
  },
  {
    label: "Skip First User",
    query: "MATCH (u:User) RETURN u.fullName ORDER BY u.fullName SKIP 1 LIMIT 2",
    description: "Pagination example"
  },

  // Update
  {
    label: "Update User Name",
    query: "MATCH (u:User {fullName:'John Doe'}) SET u.fullName='John Doe Jr.'",
    description: "Update user property"
  },

  // Delete
  {
    label: "Delete User",
    query: "MATCH (u:User {fullName:'Jane Doe'}) DETACH DELETE u",
    description: "Delete user and relationships"
  },

  {
  label: "High Centrality Users (Most Connections)",
  query: "MATCH (u:User)-[r:TRANSFER]-() RETURN u.fullName, COUNT(r) AS connectionCount ORDER BY connectionCount DESC LIMIT 5",
  description: "Find users with the most transfer connections (high centrality)"
},

{
  label: "High Cluster Participation",
  query: "MATCH (u:User)-[:TRANSFER]->(v:User)<-[:TRANSFER]-(w:User) WITH u, COUNT(DISTINCT w) AS clusterSize WHERE clusterSize >= 3 RETURN u.fullName, clusterSize ORDER BY clusterSize DESC",
  description: "Find users participating in highly clustered transfer groups"
},


  // Graph Pattern Analysis (Fraud-style)
  {
    label: "Circular Transfer Pattern",
    query: "MATCH (u1:User)-[r1:TRANSFER]->(u2:User)-[r2:TRANSFER]->(u3:User)-[r3:TRANSFER]->(u1) RETURN u1.fullName, u2.fullName, u3.fullName",
    description: "Detect circular money movement patterns"
  },
  {
    label: "Users Sharing Same Recipient",
    query: "MATCH (a:User)-[:TRANSFER]->(c:User)<-[:TRANSFER]-(b:User) WHERE a <> b RETURN a.fullName, b.fullName, c.fullName",
    description: "Detect users sending money to the same account"
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
