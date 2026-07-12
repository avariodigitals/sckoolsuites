const fs = require('fs');
const path = require('path');

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPages(full, out);
    else if (entry.name === 'page.tsx') out.push(full);
  }
  return out;
}

const pages = findPages('src/app/admin');
for (const file of pages) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('profile?.avatarUrl') || content.includes('dbUser?.avatarUrl')) continue;
  
  // Add prisma import if missing
  if (!content.includes('import { prisma } from "@/lib/db"')) {
    const match = content.match(/(import .* from "@\/lib\/[^"]+";\n)(?!.*import .* from "@\/lib\/db")/);
    if (match) {
      content = content.replace(match[0], match[0] + 'import { prisma } from "@/lib/db";\n');
    }
  }
  
  // Add dbUser query
  content = content.replace(
    /(const user = await requireRole\(\[[^\]]+\]\);\n)(?!\s*const dbUser)/,
    '$1  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });\n'
  );
  
  // Replace avatarUrl prop
  content = content.replace(
    /avatarUrl=\{profile\?\.avatarUrl \?\? undefined\}/g,
    'avatarUrl={dbUser?.avatarUrl ?? undefined}'
  );
  
  fs.writeFileSync(file, content);
  console.log('Fixed:', file);
}
console.log('Done!');
