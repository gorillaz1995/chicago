"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { client, GROQ_QUERIES, urlFor } from "@/lib/sanity";

// Updated interfaces to match our Sanity schema
interface Ad {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  location: string;
  fullAddress: string;
  image?: {
    asset: {
      _ref: string;
      _type: "reference";
    };
    alt?: string;
  };
  description: Array<{
    _type: string;
    style?: string;
    children?: Array<{
      _type: string;
      text: string;
      marks?: string[];
    }>;
  }>;
  type: "business" | "help";
  // Business fields
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string;
  // Help fields
  bankAccount?: string;
  urgencyLevel?: "low" | "medium" | "high";
  goalAmount?: number;
  // Meta fields
  featured: boolean;
  status: "active" | "paused" | "completed" | "expired";
  _createdAt: string;
}

// Real Sanity data fetching
const getAllAds = async (): Promise<Ad[]> => {
  try {
    const ads = await client.fetch(GROQ_QUERIES.getAllAds);
    return ads;
  } catch (error) {
    console.error("Error fetching ads from Sanity:", error);
    // Return empty array instead of mock data
    return [];
  }
};

// Use real Sanity image URL builder (imported from lib/sanity)

// Extract text from portable text for preview
const getTextPreview = (
  description: Ad["description"],
  maxLength = 150
): string => {
  if (!description || !Array.isArray(description)) return "";

  const text = description
    .filter((block) => block._type === "block")
    .map((block) => block.children?.map((child) => child.text).join("") || "")
    .join(" ");

  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

function SanityAdsPage() {
  const [ads, setAds] = React.useState<Ad[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"all" | "business" | "help">(
    "all"
  );

  React.useEffect(() => {
    const fetchAds = async () => {
      try {
        const fetchedAds = await getAllAds();
        setAds(fetchedAds);
      } catch (error) {
        console.error("Error fetching ads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  const filteredAds = ads.filter(
    (ad) => filter === "all" || ad.type === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Community Ads
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover local businesses to support and find ways to help community
            members in need.
          </p>
        </header>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              All ({ads.length})
            </button>
            <button
              onClick={() => setFilter("business")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === "business"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Businesses ({ads.filter((ad) => ad.type === "business").length})
            </button>
            <button
              onClick={() => setFilter("help")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === "help"
                  ? "bg-green-600 text-white"
                  : "text-gray-700 hover:text-green-600"
              }`}
            >
              Help Requests ({ads.filter((ad) => ad.type === "help").length})
            </button>
          </div>
        </div>

        {/* Ads Grid */}
        {filteredAds.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No ads found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "all"
                ? "No ads have been posted yet."
                : `No ${
                    filter === "business" ? "business" : "help request"
                  } ads found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAds.map((ad) => (
              <Link
                key={ad._id}
                href={`/sani-ty/${ad.slug.current}`}
                className="group"
              >
                <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200">
                    {ad.image ? (
                      <Image
                        src={urlFor(ad.image).width(400).height(240).url()}
                        alt={ad.image.alt || ad.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <svg
                          className="h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          ad.type === "business"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {ad.type === "business" ? "Business" : "Help Request"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {ad.title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {ad.location}
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed">
                      {getTextPreview(ad.description)}
                    </p>

                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-800">
                      Learn more
                      <svg
                        className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SanityAdsPage;
