#!/bin/bash
cd /Users/ralphmore/Documents/GitHub/sckoolsuites
git status --short > /Users/ralphmore/Documents/GitHub/sckoolsuites/.commit-status.txt 2>&1
git commit -m "fix: resolve TypeScript build errors for Vercel deployment" >> /Users/ralphmore/Documents/GitHub/sckoolsuites/.commit-status.txt 2>&1
git push origin main >> /Users/ralphmore/Documents/GitHub/sckoolsuites/.commit-status.txt 2>&1
echo "DONE" >> /Users/ralphmore/Documents/GitHub/sckoolsuites/.commit-status.txt
