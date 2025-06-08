# Sanity.io Integration Setup Guide

This guide will help you set up Sanity.io CMS integration for the Community Ads feature.

## Dependencies to Install

```bash
npm install next-sanity @sanity/image-url @portabletext/react @sanity/client
```

## Environment Variables

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## Sanity Studio Setup

1. Create a new Sanity project:

```bash
npm create sanity@latest
```

2. In your Sanity studio project, add the schema file (`sanity-schema-reference/ad.ts`) to your schemas folder.

3. Update your `sanity.config.ts` file to include the ad schema:

```typescript
import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { adSchema } from "./schemas/ad";

export default defineConfig({
  name: "default",
  title: "Community Ads CMS",
  projectId: "your_project_id",
  dataset: "production",
  plugins: [deskTool(), visionTool()],
  schema: {
    types: [adSchema],
  },
});
```

## Update Next.js Files

Once you have Sanity dependencies installed, update these files:

### 1. Update `src/lib/sanity.ts`

Replace the mock interfaces with proper Sanity imports:

```typescript
import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";
```

### 2. Update `src/components/PortableText.tsx`

Replace the mock PortableText component with the real one:

```typescript
import { PortableText as SanityPortableText } from "@portabletext/react";

export const PortableText = ({ content }: { content: any }) => {
  return <SanityPortableText value={content} />;
};
```

### 3. Update the page components

Replace the mock data fetching functions with real Sanity client calls:

```typescript
import { client, GROQ_QUERIES } from "@/lib/sanity";

// In your page components
const getAllAds = async (): Promise<Ad[]> => {
  return await client.fetch(GROQ_QUERIES.getAllAds);
};

const getAdBySlug = async (slug: string): Promise<Ad | null> => {
  return await client.fetch(GROQ_QUERIES.getAdBySlug, { slug });
};
```

## Features Included

### 📱 Dynamic Pages

- `/sani-ty` - Lists all community ads with filtering
- `/sani-ty/[slug]` - Individual ad pages with full details

### 🎨 Conditional Rendering

- Business ads show: phone, email, visit CTA
- Help request ads show: bank account, donation CTA

### 🖼️ Image Optimization

- Automatic Sanity CDN optimization
- Responsive image handling
- Hotspot and crop support

### 📝 Rich Text Support

- Portable Text rendering
- Support for headings, links, formatting
- Custom component blocks (extensible)

### 🔍 SEO Ready

- Static generation with ISR
- Proper meta tags and alt text
- Semantic HTML structure

### 📊 Type Safety

- Full TypeScript support
- Proper interface definitions
- Runtime validation

## GROQ Queries Included

1. **Get all ads** - For listing page with filters
2. **Get ad by slug** - For individual ad pages
3. **Get all slugs** - For static path generation

## Schema Features

- **Conditional fields** - Show/hide based on ad type
- **Validation rules** - Ensure data quality
- **Rich previews** - Easy content management
- **Image optimization** - Built-in Sanity CDN

## Next Steps

1. Install the dependencies
2. Set up your Sanity studio project
3. Configure environment variables
4. Replace mock functions with real Sanity client calls
5. Test with real data from your CMS

The structure is designed to be scalable and maintainable, perfect for your NGO's community ad system!
