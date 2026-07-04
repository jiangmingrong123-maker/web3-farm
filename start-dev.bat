@echo off
cd /d "%~dp0"
echo.
echo  Web3 Farm - dev server
echo  ----------------------
echo  IMPORTANT: Use ONLY the URL shown after "Local:" below.
echo  Do NOT mix localhost:3000 and :3001 — that breaks the page.
echo  Do NOT run "npm run build" while dev is running.
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

if exist .next (
  echo  Clearing stale .next cache...
  rmdir /s /q .next
)

npm run dev -- -p 3000
