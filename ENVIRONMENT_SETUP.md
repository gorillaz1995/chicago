# Environment Setup

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=ak27fq26
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

## Project Configuration

Your Sanity studio is already configured with:

- Project ID: `ak27fq26`
- Dataset: `production`
- Studio running on: `http://localhost:3333`

## Next Steps

1. Create the `.env.local` file with the variables above
2. Start your Sanity studio: `cd sanity-studio/studio-test && npm run dev`
3. Start your Next.js app: `cd chicago_projekt && npm run dev`
4. Create some test ads in the Sanity studio
5. View them on your Next.js app at `/sani-ty`

The integration is now complete and ready to use!
