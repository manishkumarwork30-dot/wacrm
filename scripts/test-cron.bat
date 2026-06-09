@echo off
REM Test script for automation cron endpoint (Windows)
REM This script simulates the cron job that triggers wait step resumption

set CRON_SECRET=802b989bd2f316869485603bd3366963122db4ba5f9c7c2d37f52b0002c076f8
set PORT=3001

echo Testing automation cron endpoint...
curl -X GET "http://localhost:%PORT%/api/automations/cron" -H "x-cron-secret: %CRON_SECRET%" -v

echo.
echo Done.