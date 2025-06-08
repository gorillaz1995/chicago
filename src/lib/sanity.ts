import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

// Sanity configuration from environment variables
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION!;

// Create Sanity client with production settings
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Enable CDN for better performance in production
  perspective: "published", // Only fetch published content
});

// Image URL builder with optimized settings
const builder = imageUrlBuilder(client);

export const urlFor = (source: SanityImageSource) =>
  builder.image(source).auto("format").quality(80); // Optimize image delivery

// GROQ Queries with performance optimizations
export const GROQ_QUERIES = {
  // Get all ad slugs for static generation
  getAllAdSlugs: `*[_type == "ad" && defined(slug.current) && !(_id in path('drafts.**'))][]{
    "slug": slug.current
  }`,

  // Get single ad by slug with efficient field selection
  getAdBySlug: `*[_type == "ad" && slug.current == $slug && !(_id in path('drafts.**'))][0]{
    _id,
    title,
    slug,
    location,
    fullAddress,
    image,
    description,
    type,
    phone,
    email,
    website,
    businessHours,
    bankAccount,
    urgencyLevel,
    goalAmount,
    featured,
    status,
    _createdAt,
    _updatedAt
  }`,

  // Get all ads with pagination support and draft filtering
  getAllAds: `*[_type == "ad" && !(_id in path('drafts.**'))] | order(_createdAt desc) {
    _id,
    title,
    slug,
    location,
    fullAddress,
    image,
    description,
    type,
    phone,
    email,
    website,
    businessHours,
    bankAccount,
    urgencyLevel,
    goalAmount,
    featured,
    status,
    _createdAt
  }`,
};

// TypeScript interfaces for type safety
export interface Ad {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  location: string;
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
  }>; // Portable Text array
  fullAddress: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  type: "business" | "help";
  _createdAt: string;
  _updatedAt?: string;
}

export interface AdSlug {
  slug: string;
}
