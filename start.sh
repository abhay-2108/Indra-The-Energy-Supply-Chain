#!/bin/bash

# Start FastAPI backend (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &

# Start Next.js frontend (port 3000)
cd frontend && npm run start -- -p 3000 &

# Go back
cd ..

# Start Nginx in foreground to keep container running
nginx -g "daemon off;"
