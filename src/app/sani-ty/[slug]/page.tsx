"use client";

import React from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import PortableText from "@/components/PortableText";
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
  _updatedAt?: string;
}

interface AdPageProps {
  params: {
    slug: string;
  };
}

// Real Sanity data fetching
const getAdBySlug = async (slug: string): Promise<Ad | null> => {
  try {
    const ad = await client.fetch(GROQ_QUERIES.getAdBySlug, { slug });
    return ad;
  } catch (error) {
    console.error("Error fetching ad from Sanity:", error);
    return null;
  }
};

const AdPage: React.FC<AdPageProps> = async ({ params }) => {
  const { slug } = params;

  try {
    const ad = await getAdBySlug(slug);

    if (!ad) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header Section */}
          <header className="mb-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Image */}
              <div className="lg:w-1/2">
                {ad.image ? (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-lg">
                    <Image
                      src={urlFor(ad.image).width(600).height(600).url()}
                      alt={ad.image.alt || ad.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="lg:w-1/2">
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      ad.type === "business"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {ad.type === "business"
                      ? "Business Sponsor"
                      : "Help Request"}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {ad.title}
                </h1>

                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 mr-2"
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
                    <span>{ad.location}</span>
                  </div>

                  <div className="flex items-start text-gray-600">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span>{ad.fullAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Description */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Description
            </h2>
            <div className="prose prose-lg max-w-none">
              <PortableText content={ad.description} />
            </div>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone (for business type) */}
                {ad.type === "business" && ad.phone && (
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Phone</p>
                      <a
                        href={`tel:${ad.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {ad.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Email (for business type) */}
                {ad.type === "business" && ad.email && (
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <a
                        href={`mailto:${ad.email}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {ad.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Bank Account (for help type) */}
                {ad.type === "help" && ad.bankAccount && (
                  <div className="flex items-center md:col-span-2">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">
                        Bank Account for Donations
                      </p>
                      <p className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                        {ad.bankAccount}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center">
            {ad.type === "business" ? (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Visit This Business
                </h3>
                <p className="text-blue-700">
                  Support our community sponsors by visiting them at their
                  location.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  How You Can Help
                </h3>
                <p className="text-green-700">
                  Your donation can make a real difference in someone&apos;s
                  life.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching ad:", error);
    notFound();
  }
};

export default AdPage;
