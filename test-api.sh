#!/bin/bash
echo "Starting server..."
npm run dev &
SERVER_PID=$!
sleep 3
echo ""
echo "Testing Health Endpoint:"
curl -s http://localhost:3000/health | head -50
echo ""
echo ""
echo "Testing API Root:"
curl -s http://localhost:3000/api/v1/ | head -50
kill $SERVER_PID 2>/dev/null
