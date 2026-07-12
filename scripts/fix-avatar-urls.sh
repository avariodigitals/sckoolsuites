#!/bin/bash
# Script to add avatarUrl to all shell pages that are missing it

# Fix ModernPortalShell pages with user.name || pattern
find src/app -name "page.tsx" -exec grep -l "ModernPortalShell" {} \; | while read f; do
  if grep -q "avatarUrl" "$f"; then continue; fi
  if grep -q 'userName={user.name || "Admin"}' "$f"; then
    sed -i '' 's/userName={user.name || "Admin"}/userName={user.name || "Admin"}\n      avatarUrl={user.avatarUrl ?? undefined}/g' "$f"
  elif grep -q 'userName={user.name ?? "Admin"}' "$f"; then
    sed -i '' 's/userName={user.name ?? "Admin"}/userName={user.name ?? "Admin"}\n      avatarUrl={user.avatarUrl ?? undefined}/g' "$f"
  fi
done

# Fix PortalShell pages
count=0
find src/app -name "page.tsx" -exec grep -l "PortalShell" {} \; | while read f; do
  if grep -q "avatarUrl" "$f"; then continue; fi
  if grep -q 'userName={user.name || "Admin"}' "$f"; then
    sed -i '' 's/userName={user.name || "Admin"}/userName={user.name || "Admin"}\n      avatarUrl={user.avatarUrl ?? undefined}/g' "$f"
  elif grep -q 'userName={user.name ?? "Admin"}' "$f"; then
    sed -i '' 's/userName={user.name ?? "Admin"}/userName={user.name ?? "Admin"}\n      avatarUrl={user.avatarUrl ?? undefined}/g' "$f"
  fi
done

echo "Done"
