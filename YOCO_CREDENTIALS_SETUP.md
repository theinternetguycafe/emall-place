# Yoco Credentials Setup Guide

## Issue
Currently getting `401 Unauthorized: "The provided credentials are invalid"` from Yoco API.

## Root Causes
1. **Wrong key type**: Using public key instead of secret key (secret keys start with `sk_`)
2. **Mode mismatch**: YOCO_MODE not explicitly set, relying on key introspection
3. **Missing validation**: No clear feedback on what's wrong

## Solution: Explicit Environment Control

### Step 1: Get Your Yoco Secret Key

Go to your Yoco Dashboard:
- **Test/Sandbox**: https://dashboard.sandbox.yoco.com/settings/developers
- **Live**: https://dashboard.yoco.com/settings/developers

Look for SECRET KEY (not Public Key):
- Format: `sk_test_xxxxxxxxxxxxxxxx` (sandbox)
- Format: `sk_live_xxxxxxxxxxxxxxxx` (live)

### Step 2: Set Supabase Function Secrets

Run these exact commands in your terminal:

```bash
# For SANDBOX/TEST environment (recommended for development)
npx supabase secrets set YOCO_SECRET_KEY "sk_test_xxxxxxxxxxxxxxxx" --project-id krbbibcoxvmcwgsugvvx
npx supabase secrets set YOCO_MODE "sandbox" --project-id krbbibcoxvmcwgsugvvx

# For LIVE/PRODUCTION environment (after testing)
# npx supabase secrets set YOCO_SECRET_KEY "sk_live_xxxxxxxxxxxxxxxx" --project-id krbbibcoxvmcwgsugvvx
# npx supabase secrets set YOCO_MODE "live" --project-id krbbibcoxvmcwgsugvvx
```

Replace:
- `sk_test_xxxxxxxxxxxxxxxx` with your actual Yoco test secret key
- `sk_live_xxxxxxxxxxxxxxxx` with your actual Yoco live secret key
- `krbbibcoxvmcwgsugvvx` with your Supabase project ID

### Step 3: Verify Secrets Are Set

```bash
npx supabase secrets list --project-id krbbibcoxvmcwgsugvvx
```

You should see:
```
YOCO_SECRET_KEY     ✓ Configured
YOCO_MODE           ✓ Configured
```

### Step 4: Deploy Function

```bash
npx supabase functions deploy yoco-initiate --no-verify-jwt
```

### Step 5: Test

The function will now:
- ✓ Validate that YOCO_SECRET_KEY starts with `sk_`
- ✓ Use explicit YOCO_MODE ('sandbox' or 'live') instead of guessing from key
- ✓ Log clear error messages if credentials are invalid
- ✓ Return helpful 401 error if credentials don't match chosen mode

## Updated Function Features

### New getYocoApiUrl() Function
```typescript
function getYocoApiUrl(): string {
  const yocoMode = Deno.env.get("YOCO_MODE") || "sandbox";
  const secretKey = Deno.env.get("YOCO_SECRET_KEY") || "";
  
  // Validates:
  // 1. YOCO_SECRET_KEY is configured and starts with 'sk_'
  // 2. YOCO_MODE is either 'sandbox' or 'live'
  // 3. Logs which mode and key type is being used
  
  // Returns correct API URL based on YOCO_MODE, not key introspection
}
```

### Enhanced Error Logging
- Detailed status, statusText, message, and error details
- Special handling for 401 Unauthorized with helpful message
- All errors logged with `[yoco-initiate]` prefix for debugging

## Common Issues & Fixes

### Error: "YOCO_SECRET_KEY does not start with 'sk_'"
→ You're using a **Public Key**, not Secret Key
→ Get the SECRET KEY from Yoco Dashboard

### Error: "Invalid Yoco credentials - check YOCO_SECRET_KEY and YOCO_MODE"
→ One of these is true:
  1. YOCO_SECRET_KEY is for the wrong environment (test key with live mode)
  2. YOCO_SECRET_KEY is incorrect or expired
  3. YOCO_MODE doesn't match your key (e.g., test key + live mode)

### 401 Unauthorized from Yoco
→ Check:
  1. YOCO_SECRET_KEY is the SECRET key, not PUBLIC key
  2. YOCO_MODE matches your key (sandbox=test, live=prod)
  3. Key hasn't expired in Yoco Dashboard
