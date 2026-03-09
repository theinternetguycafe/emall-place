# Deployment Guide for GitHub Pages

This guide will help you deploy your eMall Place application to GitHub Pages.

## Prerequisites

1. A GitHub account
2. Git installed on your computer
3. Node.js and npm installed

## Step 1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (name it something like `emall-place`)
3. Don't initialize with README, .gitignore, or license (we already have those)
4. Copy the repository URL

## Step 3: Connect Local Repository to GitHub

```bash
git remote add origin YOUR_REPOSITORY_URL
git branch -M main
git push -u origin main
```

## Step 4: Configure Vite for GitHub Pages

The `vite.config.ts` file has already been configured with the correct base path.

## Step 5: Build the Project

```bash
npm run build
```

## Step 6: Deploy to GitHub Pages

### Option A: Using gh-pages (Recommended)

1. Install gh-pages package:
```bash
npm install -D gh-pages
```

2. Add deploy script to package.json (already added):
```json
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}
```

3. Deploy:
```bash
npm run deploy
```

### Option B: Manual Deployment

1. Build the project:
```bash
npm run build
```

2. The built files will be in the `dist` folder

3. Push the dist folder to a gh-pages branch:
```bash
git checkout -b gh-pages
git add -f dist
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

## Step 7: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on Settings
3. Click on Pages (in the left sidebar)
4. Under "Build and deployment", select:
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Folder: / (root)
5. Click Save

## Step 8: Access Your Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

## Important Notes

### Environment Variables

GitHub Pages doesn't support environment variables in the same way as local development. You'll need to:

1. Go to your repository Settings
2. Click on Secrets and variables > Actions
3. Add your Supabase credentials as repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

However, GitHub Pages doesn't automatically inject these secrets into the build. For GitHub Pages, you have two options:

#### Option 1: Hardcode credentials (Not recommended for production)
Edit your `.env` file and remove the values, then add them directly to your code:
```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

#### Option 2: Use GitHub Actions with custom build
Create a `.github/workflows/deploy.yml` file that builds with environment variables and deploys to gh-pages.

### Supabase Configuration

Make sure your Supabase project allows requests from your GitHub Pages domain:
1. Go to your Supabase project dashboard
2. Navigate to Authentication > URL Configuration
3. Add your GitHub Pages URL to "Site URL" and "Redirect URLs"

### Troubleshooting

If you see a blank page:
- Check the browser console for errors
- Make sure the base path in `vite.config.ts` matches your repository name
- Verify that all assets are loading correctly

If authentication doesn't work:
- Check that your Supabase credentials are correct
- Verify that your GitHub Pages URL is added to Supabase's allowed redirect URLs
