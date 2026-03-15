# Auto Expiry Sales - Deployment Guide

## Deploy Edge Function to Supabase

### Step 1: Deploy the Function

Go to **Supabase Dashboard** → **Your Project** → **Edge Functions**

1. Click **Create a new Function**
2. Name: `auto-expire-sales`
3. Copy the code from `supabase/functions/auto-expire-sales/index.ts`
4. Paste it into the function editor
5. Click **Deploy**

### Step 2: Get Your Function URL

After deployment, you'll see a URL like:
```
https://your-project-id.functions.supabase.co/auto-expire-sales
```

Copy this URL - you'll need it for the next step.

### Step 3: Get Your Service Key

Go to **Supabase Dashboard** → **Settings** → **API** → Look for **Service Role Key**

Copy this key (it starts with `eyJhbGc...`).

### Step 4: Set Up Cron Job

Go to **Supabase Dashboard** → **SQL Editor** and run this query:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-expire-sales function to run hourly
SELECT cron.schedule(
  'expire-sales',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.functions.supabase.co/auto-expire-sales',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Replace:**
- `YOUR_PROJECT_ID` - Your Supabase project ID (from the function URL)
- `YOUR_SERVICE_KEY` - Your Service Role Key (from step 3)

### Step 5: Test It

To manually test the function, run:

```bash
curl -X POST https://your-project-id.functions.supabase.co/auto-expire-sales \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully expired 0 sale(s)",
  "expiredCount": 0,
  "timestamp": "2026-03-15T10:30:00.000Z"
}
```

### Step 6: Verify Cron Job

To check if the cron job was created, run:

```sql
SELECT * FROM cron.job;
```

You should see a job named `expire-sales`.

To view logs, check the Edge Functions dashboard or run:

```sql
SELECT * FROM net.http_request_queue;
```

## Testing the Feature End-to-End

1. **Create a test product on sale** with `sale_ends_at` set to 1 minute from now
2. **Wait 2 minutes**
3. Go to the product details page or admin dashboard
4. The `is_on_sale` should be `false` and the badge should be gone

## Definition of Done ✅

- ✅ Edge function deployed and tested
- ✅ Cron job running hourly
- ✅ Sales automatically expire when `sale_ends_at` passes
- ✅ No manual intervention needed
- ✅ Zero downtime
