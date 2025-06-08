# Environment Setup Guide

## CORS Configuration ✅ COMPLETED

The following CORS origins have been configured in your Sanity project:

- `http://localhost:3333` (Sanity Studio Local)
- `http://localhost:3000` (Next.js Local)
- `https://test-21s.sanity.studio` (Sanity Studio Production)
- `https://t3ajut.eu` (Your Production Domain)

## Local Development Environment

### .env.local (Already Created)

```bash
# Sanity Configuration for Local Development
NEXT_PUBLIC_SANITY_PROJECT_ID=ak27fq26
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## Vercel Production Environment Variables

### Required Environment Variables for Vercel:

Add these to your Vercel project dashboard under Settings > Environment Variables:

1. **NEXT_PUBLIC_SANITY_PROJECT_ID**

   - Value: `ak27fq26`
   - Environment: Production, Preview, Development

2. **NEXT_PUBLIC_SANITY_DATASET**

   - Value: `production`
   - Environment: Production, Preview, Development

3. **NEXT_PUBLIC_SANITY_API_VERSION**
   - Value: `2024-01-01`
   - Environment: Production, Preview, Development

### How to Add Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with the values above
4. Select all environments (Production, Preview, Development)
5. Click "Save"

## Build Configuration

### Next.js Configuration

Your Next.js app is configured to:

- Use Sanity CDN for optimal performance
- Only fetch published content (no drafts)
- Optimize images automatically
- Enable static generation for better performance

### TypeScript Build Fix ✅ COMPLETED

- Fixed TypeScript validation error in `sanity-schema-reference/ad.ts`
- Simplified image alt text validation to avoid context type issues
- Build should now pass successfully

## Deployment Checklist

- [x] CORS configured for production domain
- [x] Environment variables documented
- [x] TypeScript build errors fixed
- [x] Local .env.local file created
- [ ] Add environment variables to Vercel
- [ ] Deploy and test

## Testing Your Setup

### Local Testing:

```bash
npm run dev
```

Visit: http://localhost:3000/sani-ty

### Production Testing (After Vercel Deploy):

Visit: https://t3ajut.eu/sani-ty

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure your domain is added to Sanity CORS settings
2. **Environment Variables**: Check that all variables are set in Vercel
3. **Build Errors**: Ensure TypeScript types are correct (now fixed)
4. **Data Not Loading**: Verify Sanity project ID and dataset are correct

### Support:

- Sanity Studio: https://test-21s.sanity.studio
- Project ID: ak27fq26
- Dataset: production
