import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { SetupWizard } from "./setup-wizard";

interface SchoolData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string | null;
  motto: string | null;
  is_active: boolean;
  is_setup: boolean;
}

interface SessionData {
  id: string;
  name: string;
}

interface TermData {
  id: string;
  name: string;
}

export default async function SetupPage() {
  // Check if setup is already complete
  const existingSchool = await queryOne<SchoolData>(
    'SELECT * FROM school WHERE id = $1',
    ['default']
  );
  
  const existingAdmin = await queryOne<{ id: string }>(
    `SELECT u.id FROM "user" u 
     JOIN role r ON u.role_id = r.id 
     WHERE r.name = 'SCHOOL_ADMIN' LIMIT 1`
  );

  // If school exists with an admin, setup is complete - redirect to login
  if (existingSchool && existingAdmin) {
    redirect("/login");
  }

  // Check setup progress
  const hasSession = existingSchool ? await queryOne<SessionData>('SELECT * FROM session LIMIT 1') : null;
  const hasTerm = hasSession ? await queryOne<TermData>('SELECT * FROM term LIMIT 1') : null;

  // Determine starting step
  let step = 1;
  if (existingSchool) step = 2;
  if (hasSession) step = 3;
  if (hasTerm) step = 4;

  return <SetupWizard 
    existingSchool={existingSchool} 
    step={step}
    existingSession={hasSession}
    existingTerm={hasTerm}
  />;
}
