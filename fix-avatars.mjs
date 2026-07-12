import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const files = globSync("src/app/admin/**/page.tsx");

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  
  // Skip if already uses dbUser?.avatarUrl
  if (content.includes("dbUser?.avatarUrl")) continue;
  
  // Skip if no profile?.avatarUrl (nothing to fix)
  if (!content.includes("profile?.avatarUrl")) continue;

  // 1. Add prisma import if missing
  if (!content.includes('import { prisma } from "@/lib/db"')) {
    // Find a good place to insert - after other imports from @/lib
    content = content.replace(
      /(import .* from "@\/lib\/[^"]+";\n)(?!.*import .* from "@\/lib\/db")/,
      '$1import { prisma } from "@/lib/db";\n'
    );
  }

  // 2. Add dbUser query after requireRole line
  content = content.replace(
    /(const user = await requireRole\([^)]+\);\n)(?!\s*const dbUser)/,
    '$1  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });\n'
  );

  // 3. Replace avatarUrl prop
  content = content.replace(
    /avatarUrl=\{profile\?\.avatarUrl \?\? undefined\}/g,
    "avatarUrl={dbUser?.avatarUrl ?? undefined}"
  );

  writeFileSync(file, content);
  console.log("Fixed:", file);
}

console.log("Done!");
