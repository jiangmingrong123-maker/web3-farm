@echo off
cd /d "%~dp0"
echo.
echo  Web3 Farm - dev server
echo  ----------------------
echo  If port 3000 is busy, Next.js will use 3001, 3002...
echo  Check the URL shown below after "Local:"
echo.
npm run dev
