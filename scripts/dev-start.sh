#!/bin/bash

# Nova App - Development Start Script
# Starts Supabase, functions, and dev server

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="$PROJECT_ROOT/src/supabase"
LOG_DIR="$PROJECT_ROOT/logs"

# Load .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Nova App (Development Mode)${NC}"

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
nohup npm run dev:legacy-tls-proxy > "$LOG_DIR/proxy.log" 2>&1 &
echo $! > "$LOG_DIR/proxy.pid"
echo -e "${GREEN}✓ Legacy TLS proxy started (PID: $(cat $LOG_DIR/proxy.pid))${NC}"

# Start Vite dev server in background
echo -e "${YELLOW}Starting Vite dev server...${NC}"
cd "$PROJECT_ROOT"
nohup npm run dev > "$LOG_DIR/vite.log" 2>&1 &
echo $! > "$LOG_DIR/vite.pid"
echo -e "${GREEN}✓ Vite dev server started (PID: $(cat $LOG_DIR/vite.pid))${NC}"

# Wait a moment for services to start
sleep 2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Nova App Development Environment Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:    ${YELLOW}http://localhost:${VITE_PORT:-5173}${NC}"
echo -e "  Supabase:    ${YELLOW}http://localhost:54321${NC}"
echo -e "  Studio:      ${YELLOW}http://localhost:54323${NC}"
echo -e "  File Server: ${YELLOW}http://localhost:8001${NC}"
echo -e "  TLS Proxy:   ${YELLOW}http://localhost:8002${NC}"
echo ""
echo -e "  Logs:        ${YELLOW}$LOG_DIR/${NC}"
echo ""
echo -e "  Stop with:   ${YELLOW}npm run dev:stop${NC}"
echo ""
