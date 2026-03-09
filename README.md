# eMall_Place - Multi-Vendor Marketplace MVP (South Africa)

A production-ready multi-vendor marketplace built with React, TypeScript, and Supabase.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, React Router, Lucide Icons
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Payments**: Abstraction layer for PayFast/Yoco

## Features
- **Auth & Roles**: Buyer, Seller, and Admin roles with Supabase Auth.
- **Multi-Tenant Catalog**: Multiple sellers can list products in various categories.
- **Cart & Multi-Seller Checkout**: Support for purchasing items from different sellers in one go.
- **Commission System**: Automated 8% commission calculation per item.
- **Seller Dashboard**: Manage products, images, stock, and fulfill orders.
- **Admin Dashboard**: Moderation (approve sellers/products) and platform analytics.
- **Security**: Granular Row Level Security (RLS) policies for data isolation.

## Setup Instructions

### 1. Supabase Configuration
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** and run the scripts in `supabase/migrations/` in order:
   - `00_schema.sql`
   - `01_rls_policies.sql`
   - `02_seed_data.sql`
   - `03_storage.sql`
3. Go to **Project Settings** -> **API** to get your `URL` and `Anon Key`.

### 2. Frontend Configuration
1. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Folder Structure
- `src/components`: Reusable UI components.
- `src/contexts`: Auth and Cart state management.
- `src/lib`: API clients and utilities (Supabase, Payments).
- `src/pages`: Main application views.
- `supabase/migrations`: Database schema and security policies.

## Deployment
Build the project for production:
```bash
npm run build
```
The output will be in the `dist/` folder, ready for hosting on Vercel, Netlify, or GitHub Pages.
