#!/bin/bash

# Nova App - Production Start Script (Local)
# Builds and serves production bundle with all services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$PROJECT_ROOT/src/supabase"
LOG_DIR="$PROJECT_ROOT/logs"
BUILD_DIR="$PROJECT_ROOT/build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Nova App (Production Mode - Local)${NC}"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to check if Supabase is running
check_supabase() {
    cd "$SUPABASE_DIR"
    if supabase status > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Supabase if not running
echo -e "${YELLOW}Checking Supabase status...${NC}"
if check_supabase; then
    echo -e "${GREEN}✓ Supabase is already running${NC}"
else
    echo -e "${YELLOW}Starting Supabase...${NC}"
    cd "$SUPABASE_DIR"
    supabase start
    echo -e "${GREEN}✓ Supabase started${NC}"
fi

# Build production bundle
echo -e "${YELLOW}Building production bundle...${NC}"
cd "$PROJECT_ROOT"
npm run build
echo -e "${GREEN}✓ Production build complete${NC}"

# Start Supabase functions in background
echo -e "${YELLOW}Starting Supabase functions...${NC}"
cd "$SUPABASE_DIR"
nohup supabase functions serve > "$LOG_DIR/functions.log" 2>&1 &
echo $! > "$LOG_DIR/functions.pid"
echo -e "${GREEN}✓ Supabase functions started (PID: $(cat $LOG_DIR/functions.pid))${NC}"

# Start file server in background
echo -e "${YELLOW}Starting file server...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev:file-server > "$LOG_DIR/file-server.log" 2>&1 &
echo $! > "$LOG_DIR/file-server.pid"
echo -e "${GREEN}✓ File server started (PID: $(cat $LOG_DIR/file-server.pid))${NC}"

# Start legacy TLS proxy in background
echo -e "${YELLOW}Starting legacy TLS proxy...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev:proxy > "$LOG_DIR/proxy.log" 2>&1 &
echo $! > "$LOG_DIR/proxy.pid"
echo -e "${GREEN}✓ Legacy TLS proxy started (PID: $(cat $LOG_DIR/proxy.pid))${NC}"

# Check if 'serve' is installed, install if not
if ! command -v serve &> /dev/null; then
    echo -e "${YELLOW}Installing 'serve' package...${NC}"
    npm install -g serve
fi

# Start production server in background
echo -e "${YELLOW}Starting production server...${NC}"
cd "$PROJECT_ROOT"
nohup serve "$BUILD_DIR" -l 5173 > "$LOG_DIR/serve.log" 2>&1 &
echo $! > "$LOG_DIR/serve.pid"
echo -e "${GREEN}✓ Production server started (PID: $(cat $LOG_DIR/serve.pid))${NC}"

# Wait a moment for services to start
sleep 2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Nova App Production Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:    ${YELLOW}http://localhost:5173${NC}"
echo -e "  Supabase:    ${YELLOW}http://localhost:54321${NC}"
echo -e "  Studio:      ${YELLOW}http://localhost:54323${NC}"
echo -e "  File Server: ${YELLOW}http://localhost:8001${NC}"
echo -e "  TLS Proxy:   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "  Logs:        ${YELLOW}$LOG_DIR/${NC}"
echo ""
echo -e "  Stop with:   ${YELLOW}npm run prod:stop${NC}"
echo ""
