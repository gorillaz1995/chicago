"use client";

import React, { useEffect, useState } from "react";
import { client } from "@/lib/sanity";

export default function TestSanityPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test basic connection
        console.log("Testing Sanity connection...");
        console.log("Project ID:", "ak27fq26");
        console.log("Dataset:", "production");
        console.log("API Version:", "2023-05-03");

        // First try a simple query to test connection
        const simpleQuery = '*[_type == "ad"]{_id, title, slug}';
        const result = await client.fetch(simpleQuery);

        // If that works, try getting all fields
        if (result) {
          const fullQuery = '*[_type == "ad"]';
          const fullResult = await client.fetch(fullQuery);
          console.log("Full result:", fullResult);
        }

        console.log("Sanity result:", result);
        setData(result);
      } catch (err) {
        console.error("Sanity error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">
          Testing Sanity Connection...
        </h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Sanity Connection Error</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Debug Info:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            Project ID: ak27fq26{"\n"}
            Dataset: production{"\n"}
            API Version: 2023-05-03
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sanity Connection Test</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold">Connection Info:</h2>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Successfully connected to Sanity!
        </div>
        <pre className="bg-gray-100 p-4 rounded mt-2">
          Project ID: ak27fq26{"\n"}
          Dataset: production{"\n"}
          API Version: 2023-05-03
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Raw Data from Sanity:</h2>
        <p className="text-sm text-gray-600 mb-2">
          Found {Array.isArray(data) ? data.length : 0} ad(s)
        </p>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      {Array.isArray(data) && data.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Ads Summary:</h2>
          <ul className="list-disc pl-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.map((ad: any, index: number) => (
              <li key={index} className="mb-2">
                <strong>{String(ad.title || "No title")}</strong>
                {ad.type && ` (${ad.type})`}
                {ad.slug?.current && ` - Slug: ${ad.slug.current}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
