# Deploy to GitHub Pages - Final Steps

Your repository URL: https://github.com/theinternetguycafe/emall-place.git

## Step 1: Authenticate with GitHub

You need to authenticate to push to the repository. Choose one of these methods:

### Option A: Using Personal Access Token (Recommended)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" > "Generate new token (classic)"
3. Give it a name (e.g., "emall-place-deploy")
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

Then run:
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/theinternetguycafe/emall-place.git
git push -u origin main
```

Replace `YOUR_TOKEN` with the actual token you copied.

### Option B: Using GitHub CLI

If you have GitHub CLI installed:
```bash
gh auth login
git push -u origin main
```

### Option C: Using SSH

If you have SSH keys set up:
```bash
git remote set-url origin git@github.com:theinternetguycafe/emall-place.git
git push -u origin main
```

## Step 2: Deploy to GitHub Pages

After successfully pushing to GitHub, run:

```bash
npm run deploy
```

This will:
1. Build your application
2. Create a `gh-pages` branch
3. Push the built files to GitHub

## Step 3: Enable GitHub Pages

1. Go to https://github.com/theinternetguycafe/emall-place/settings/pages
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / **(root)**
3. Click **Save**

## Step 4: Access Your Site

Your site will be available at:
```
https://theinternetguycafe.github.io/emall-place/
```

## Step 5: Configure Supabase

After deployment, update your Supabase settings:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Add your GitHub Pages URL to:
   - **Site URL**: `https://theinternetguycafe.github.io/emall-place/`
   - **Redirect URLs**: Add the same URL

## Troubleshooting

### If you get a 403 error:
- Make sure you're authenticated with GitHub
- Check that you have write access to the repository
- Try using a Personal Access Token (Option A above)

### If deployment fails:
- Make sure you've pushed to the main branch first
- Check that `gh-pages` package is installed
- Run `npm run build` to test the build locally

### To update your site after making changes:
```bash
git add .
git commit -m "Your commit message"
git push
npm run deploy
```

## Quick Commands Summary

```bash
# Authenticate and push (replace YOUR_TOKEN with actual token)
git remote set-url origin https://YOUR_TOKEN@github.com/theinternetguycafe/emall-place.git
git push -u origin main

# Deploy to GitHub Pages
npm run deploy
```

Your live site will be at: https://theinternetguycafe.github.io/emall-place/
