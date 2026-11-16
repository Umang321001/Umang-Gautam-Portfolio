@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install Node.js 20 or newer from https://nodejs.org/ & pause & exit /b 1)
if not exist .env copy .env.example .env
if not exist node_modules call npm install
echo Starting Umang Gautam Portfolio...
npm start
pause
