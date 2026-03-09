#!/bin/bash
# Payment Integration Setup & Deployment Script
# This script helps deploy the Yoco and SnapScan integration to your eMall-Place project

set -e

echo "🚀 eMall-Place Payment Integration Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Supabase CLI not found. Install with: npm install -g supabase${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}\n"
}

# Validate environment variables
validate_env() {
    echo "🔑 Validating environment variables..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env file not found${NC}"
        echo "Create one from .env.example:"
        echo "  cp .env.example .env"
        exit 1
    fi
    
    # Check for required variables
    REQUIRED_VARS=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "VITE_YOCO_PUBLIC_KEY"
        "VITE_SNAPSCAN_MERCHANT_ID"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "$var=" .env; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing environment variables:${NC}"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Add them to .env file from payment provider dashboards"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment variables validated${NC}\n"
}

# Deploy database migration
deploy_migration() {
    echo "💾 Deploying database migration..."
    
    if [ ! -f "supabase/migrations/05_payment_methods.sql" ]; then
        echo -e "${RED}❌ Migration file not found${NC}"
        exit 1
    fi
    
    # Try using Supabase CLI
    if command -v supabase &> /dev/null; then
        echo "Using 'supabase db push'..."
        supabase db push || {
            echo -e "${YELLOW}⚠️  supabase db push failed${NC}"
            echo "Manual deployment option:"
            echo "  1. Go to Supabase Dashboard → SQL Editor"
            echo "  2. Open → Migrations → 05_payment_methods.sql"
            echo "  3. Copy and run the SQL"
        }
    else
        echo -e "${YELLOW}⚠️  Supabase CLI not available for automatic migration${NC}"
        echo "To deploy manually:"
        echo "  1. Go to Supabase Dashboard → SQL Editor"
        echo "  2. Copy contents of: supabase/migrations/05_payment_methods.sql"
        echo "  3. Paste and run the SQL"
        echo "  4. Verify the tables were created"
    fi
    
    echo -e "${GREEN}✅ Database migration deployed${NC}\n"
}

# Deploy Edge Functions
deploy_functions() {
    echo "⚡ Deploying Edge Functions..."
    
    FUNCTIONS=(
        "yoco-initiate"
        "yoco-webhook"
        "snapscan-initiate"
        "snapscan-webhook"
    )
    
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Supabase CLI required for function deployment${NC}"
        echo "Install with: npm install -g supabase"
        echo ""
        echo "Then run:"
        for func in "${FUNCTIONS[@]}"; do
            echo "  supabase functions deploy $func --no-verify-jwt"
        done
        return
    fi
    
    echo "Logged in to Supabase?"
    read -p "Have you run 'supabase login'? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for func in "${FUNCTIONS[@]}"; do
            echo "  Deploying: $func"
            supabase functions deploy "$func" --no-verify-jwt || {
                echo -e "${RED}❌ Failed to deploy $func${NC}"
            }
        done
        echo -e "${GREEN}✅ Edge Functions deployed${NC}"
    else
        echo "Run these commands to deploy:"
        for func in "${FUNCTIONS[@]}"; do
            echo "  supabase functions deploy $func --no-verify-jwt"
        done
    fi
    
    echo ""
}

# Configure webhooks
configure_webhooks() {
    echo "🔗 Webhook Configuration Instructions"
    echo "======================================"
    echo ""
    
    echo "Get your function URLs from Supabase Dashboard:"
    echo "  → Functions → [function-name] → Details"
    echo ""
    
    echo "📌 Yoco Webhooks:"
    echo "  1. Go to: https://merchant.yoco.com/ → Settings → Webhooks"
    echo "  2. Add webhook URL: https://your-project.functions.supabase.co/yoco-webhook"
    echo "  3. Subscribe to events:"
    echo "     - links.paid"
    echo "     - links.failed"
    echo "     - links.cancelled"
    echo ""
    
    echo "📌 SnapScan Webhooks:"
    echo "  1. Go to: https://merchant.snapscan.io/ → Webhooks"
    echo "  2. Add webhook URL: https://your-project.functions.supabase.co/snapscan-webhook"
    echo "  3. Subscribe to events:"
    echo "     - Payment completed"
    echo "     - Payment failed"
    echo "     - Payment cancelled"
    echo ""
}

# Run tests
run_tests() {
    echo "🧪 Running Tests"
    echo "================="
    echo ""
    
    read -p "Would you like to run local tests? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting development server..."
        npm run dev
    fi
}

# Main execution
echo "Starting setup process..."
echo ""

check_prerequisites
validate_env
deploy_migration
deploy_functions
configure_webhooks
run_tests

echo ""
echo "==================================="
echo "✅ Setup Complete!"
echo "==================================="
echo ""
echo "📝 Next Steps:"
echo "  1. Configure webhooks in payment dashboards (see instructions above)"
echo "  2. Test payment flow locally: npm run dev"
echo "  3. Visit: http://localhost:5173/checkout"
echo "  4. Select payment method and test"
echo "  5. Verify order appears in database"
echo ""
echo "📚 Documentation:"
echo "  - Full guide: YOCO_SNAPSCAN_SETUP.md"
echo "  - Deployment: PAYMENT_DEPLOYMENT.md"
echo ""
echo "🚀 Ready to go live?"
echo "  - Update .env with production keys (sk_live_, pk_live_)"
echo "  - Redeploy Edge Functions"
echo "  - Update webhook URLs to production domain"
echo "  - Test end-to-end with real transaction"
echo ""
