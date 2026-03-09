# Quick Deploy to GitHub Pages

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository with a name (e.g., `emall-place`)
3. **Important:** Make the repository **Public** (GitHub Pages requires public repos for free hosting)
4. Don't initialize with README, .gitignore, or license
5. Click "Create repository"

## Step 2: Connect to GitHub

Copy your repository URL and run:

```bash
git remote add origin YOUR_REPOSITORY_URL
git branch -M main
git push -u origin main
```

Replace `YOUR_REPOSITORY_URL` with your actual repository URL (e.g., `https://github.com/YOUR_USERNAME/emall-place.git`)

## Step 3: Update vite.config.ts

Open `vite.config.ts` and update the base path to match your repository name:

```typescript
base: process.env.NODE_ENV === 'production' ? '/YOUR_REPOSITORY_NAME/' : '/',
```

Replace `YOUR_REPOSITORY_NAME` with your actual repository name (e.g., `emall-place`)

## Step 4: Deploy

Run the deploy command:

```bash
npm run deploy
```

This will:
1. Build your application
2. Create a `gh-pages` branch
3. Push the built files to GitHub

## Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Pages** (in the left sidebar under "Code and automation")
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / **(root)**
5. Click **Save**

## Step 6: Access Your Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

Example: `https://johnsmith.github.io/emall-place/`

## Important: Configure Supabase

After deployment, you need to update your Supabase settings:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Add your GitHub Pages URL to:
   - **Site URL**: `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`
   - **Redirect URLs**: Add the same URL

## Troubleshooting

### If you see a blank page:
- Check the browser console (F12) for errors
- Make sure the base path in `vite.config.ts` matches your repository name
- Verify that GitHub Pages is enabled and the gh-pages branch exists

### If authentication doesn't work:
- Make sure your Supabase credentials are correct in `.env`
- Verify that your GitHub Pages URL is added to Supabase's allowed redirect URLs
- Check the browser console for authentication errors

### To update your site after making changes:
```bash
git add .
git commit -m "Your commit message"
git push
npm run deploy
```

## Need Help?

Check the full deployment guide in `DEPLOYMENT.md` for more detailed instructions.
