#!/bin/bash

# Backend Structure Migration Script
# Run this from: services/backend/

set -e  # Exit on error

echo "🚀 Starting backend structure migration..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Create new directory structure
# ============================================================================
echo -e "${BLUE}📁 Step 1: Creating new directory structure...${NC}"

mkdir -p app/core
mkdir -p app/generation/{parametric,reference_modes/{exact,redesign,inspiration,rethink},prompts/{core,taste_injection,modes,legacy}}
mkdir -p app/feedback/prompts
mkdir -p app/integrations/{figma,mobbin}
mkdir -p app/websockets

# Create __init__.py files
touch app/core/__init__.py
touch app/generation/__init__.py
touch app/generation/parametric/__init__.py
touch app/generation/reference_modes/__init__.py
touch app/generation/reference_modes/exact/__init__.py
touch app/generation/reference_modes/redesign/__init__.py
touch app/generation/reference_modes/inspiration/__init__.py
touch app/generation/reference_modes/rethink/__init__.py
touch app/generation/prompts/__init__.py
touch app/feedback/__init__.py
touch app/feedback/prompts/__init__.py
touch app/integrations/__init__.py
touch app/integrations/figma/__init__.py
touch app/integrations/mobbin/__init__.py
touch app/websockets/__init__.py

echo -e "${GREEN}✓ Directory structure created${NC}"

# ============================================================================
# Step 2: Move core infrastructure files
# ============================================================================
echo -e "${BLUE}📦 Step 2: Moving core infrastructure files...${NC}"

mv app/auth.py app/core/ 2>/dev/null || echo "  ⚠ auth.py not found (skipping)"
mv app/db.py app/core/ 2>/dev/null || echo "  ⚠ db.py not found (skipping)"
mv app/models.py app/core/ 2>/dev/null || echo "  ⚠ models.py not found (skipping)"
mv app/storage.py app/core/ 2>/dev/null || echo "  ⚠ storage.py not found (skipping)"

echo -e "${GREEN}✓ Core files moved${NC}"

# ============================================================================
# Step 3: Move generation files
# ============================================================================
echo -e "${BLUE}🎨 Step 3: Moving generation files...${NC}"

# Main generation files
mv app/generation_orchestrator.py app/generation/orchestrator.py 2>/dev/null || echo "  ⚠ generation_orchestrator.py not found (skipping)"
mv app/progressive_streaming.py app/generation/streaming.py 2>/dev/null || echo "  ⚠ progressive_streaming.py not found (skipping)"
mv app/checkpoint_extractor.py app/generation/checkpoints.py 2>/dev/null || echo "  ⚠ checkpoint_extractor.py not found (skipping)"
mv app/prompt_selector.py app/generation/prompt_selector_old.py 2>/dev/null || echo "  ⚠ prompt_selector.py not found (skipping)"

# Move parametric subdirectory
if [ -d "app/parametric" ]; then
    # Move contents
    mv app/parametric/* app/generation/parametric/ 2>/dev/null
    rmdir app/parametric
    echo "  ✓ Moved parametric/ to generation/parametric/"
else
    echo "  ⚠ parametric/ directory not found (skipping)"
fi

# Move prompts directory
if [ -d "app/prompts" ]; then
    # Move all prompts to legacy first
    mv app/prompts/* app/generation/prompts/legacy/ 2>/dev/null
    rmdir app/prompts
    echo "  ✓ Moved prompts/ to generation/prompts/legacy/"
else
    echo "  ⚠ prompts/ directory not found (skipping)"
fi

echo -e "${GREEN}✓ Generation files moved${NC}"

# ============================================================================
# Step 4: Move reference mode files (Phase 2)
# ============================================================================
echo -e "${BLUE}🔄 Step 4: Moving reference mode files (Phase 2)...${NC}"

mv app/wireframe_processor.py app/generation/reference_modes/redesign/ 2>/dev/null || echo "  ⚠ wireframe_processor.py not found (skipping)"
mv app/rethink_processor.py app/generation/reference_modes/rethink/processor.py 2>/dev/null || echo "  ⚠ rethink_processor.py not found (skipping)"

echo -e "${GREEN}✓ Reference mode files moved${NC}"

# ============================================================================
# Step 5: Move feedback files
# ============================================================================
echo -e "${BLUE}💬 Step 5: Moving feedback files...${NC}"

mv app/feedback_router.py app/feedback/router.py 2>/dev/null || echo "  ⚠ feedback_router.py not found (skipping)"
mv app/feedback_applier.py app/feedback/applier.py 2>/dev/null || echo "  ⚠ feedback_applier.py not found (skipping)"

echo -e "${GREEN}✓ Feedback files moved${NC}"

# ============================================================================
# Step 6: Move WebSocket files
# ============================================================================
echo -e "${BLUE}🔌 Step 6: Moving WebSocket files...${NC}"

mv app/websocket_handler.py app/websockets/handler.py 2>/dev/null || echo "  ⚠ websocket_handler.py not found (skipping)"
mv app/websocket_lambda_handler.py app/websockets/lambda_handler.py 2>/dev/null || echo "  ⚠ websocket_lambda_handler.py not found (skipping)"
mv app/websocket_routes.py app/websockets/routes.py 2>/dev/null || echo "  ⚠ websocket_routes.py not found (skipping)"

echo -e "${GREEN}✓ WebSocket files moved${NC}"

# ============================================================================
# Step 7: Move integration files
# ============================================================================
echo -e "${BLUE}🔗 Step 7: Moving integration files...${NC}"

mv app/figma_service.py app/integrations/figma/service.py 2>/dev/null || echo "  ⚠ figma_service.py not found (skipping)"
mv app/mobbin_scraper.py app/integrations/mobbin/scraper.py 2>/dev/null || echo "  ⚠ mobbin_scraper.py not found (skipping)"
mv app/mobbin_scraper_service.py app/integrations/mobbin/service.py 2>/dev/null || echo "  ⚠ mobbin_scraper_service.py not found (skipping)"

echo -e "${GREEN}✓ Integration files moved${NC}"

# ============================================================================
# Step 8: List remaining files (should be minimal)
# ============================================================================
echo -e "${BLUE}📋 Step 8: Checking remaining files in app/...${NC}"
echo ""
echo "Remaining files in app/:"
find app/ -maxdepth 1 -type f -name "*.py" | grep -v __pycache__ | sort
echo ""

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review the new structure"
echo "2. Update imports in all files (see import_updates.txt)"
echo "3. Test the application"
echo "4. Delete old/unused files"
echo ""
echo "New structure:"
echo "app/"
echo "├── core/           # Infrastructure"
echo "├── dtr/            # Don't touch"
echo "├── dtm/            # Don't touch"
echo "├── llm/            # Don't touch"
echo "├── generation/     # Phase 1 focus"
echo "│   ├── parametric/"
echo "│   ├── reference_modes/"
echo "│   └── prompts/"
echo "├── feedback/       # Phase 1.5"
echo "├── integrations/   # External services"
echo "├── websockets/     # WebSocket handlers"
echo "└── routers/        # REST API"
echo ""
