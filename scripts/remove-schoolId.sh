#!/bin/bash
# Script to remove schoolId references from API files for single-school conversion

API_DIR="/Users/ralphmore/Documents/GitHub/sckoolsuites/src/app/api"

echo "Removing schoolId checks from API files..."

# Replace schoolId session checks with simple session checks
find "$API_DIR" -name "*.ts" -exec sed -i '' \
  -e 's/session?\.user?\.schoolId || !isAuthorized(!session || !isAuthorized/g' \
  -e 's/session?\.user?\.schoolId || !session\.user\.id || !isAuthorized(!session || !session.user.id || !isAuthorized/g' \
  -e 's/!session?\.user?\.schoolId || !isAuthorized(!session || !isAuthorized/g' \
  -e 's/session?\.user?\.schoolId || !\["SCHOOL_ADMIN"/!session || !["SCHOOL_ADMIN"/g' \
  {} \;

# Remove schoolId variable declarations
find "$API_DIR" -name "*.ts" -exec sed -i '' \
  -e 's/const schoolId = session\.user\.schoolId;//g' \
  -e 's/schoolId: session\.user\.schoolId,//g' \
  {} \;

# Remove schoolId from where clauses in prisma queries
find "$API_DIR" -name "*.ts" -exec sed -i '' \
  -e 's/schoolId: session\.user\.schoolId,//g' \
  -e 's/where: { schoolId },/where: {},/g' \
  -e 's/where: { schoolId: .* },/where: {},/g' \
  {} \;

# Remove schoolId from prisma queries entirely
find "$API_DIR" -name "*.ts" -exec sed -i '' \
  -e 's/, schoolId:/,/g' \
  -e 's/schoolId: schoolId,//g' \
  -e 's/schoolId,//g' \
  {} \;

echo "Done! Manual review still required for complex cases."
