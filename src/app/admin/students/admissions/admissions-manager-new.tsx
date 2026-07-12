"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, X } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  TESTED: "bg-blue-100 text-blue-700",
  INTERVIEWED: "bg-violet-100 text-violet-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};
const statusLabels: Record<string, string> = {
  PENDING: "Pending", TESTED: "Tested", INTERVIEWED: "Interviewed",
  APPROVED: "Approved", REJECTED: "Rejected", WITHDRAWN: "Withdrawn",
};
const pipelineStatuses = ["PENDING", "TESTED", "INTERVIEWED", "APPROVED", "REJECTED", "WITHDRAWN"];

type Address = { addressLine1: string; addressLine2: string; city: string; state: string; zipcode: string; country: string };
type Guardian = {
  name: string;
  email: string | null;
  contactNumber: string | null;
  relationship: string;
  isNew: boolean;
  occupation: string | null;
  employerName: string | null;
  workAddress: string | null;
  workPhone: string | null;
  homeAddress: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentUrl: string | null;
  photoUrl: string | null;
  isPrimary: boolean;
};
type DocItem = { id?: string; documentType: string; title: string; issueDate: string; validityStart: string; description: string; fileUrl: string };
type QualItem = { id?: string; qualificationLevel: string; course: string; session: string; institute: string; instituteAddress: string; affiliatedTo: string; startDate: string; endDate: string; result: string; fileUrl: string };
type Application = {
  id: string; applicantNumber: string; sessionId: string | null; enrollmentType: string;
  firstName: string; lastName: string; name: string; email: string;
  contactNumber: string | null; alternateContactNumber: string | null; alternateEmail: string | null;
  gender: string | null; dateOfBirth: string | null; age: number | null;
  birthPlace: string | null; nationality: string | null; motherTongue: string | null; bloodGroup: string | null; religion: string | null;
  address: string | null; presentAddress: Address | null; permanentAddress: Address | null;
  previousInstitute: string | null; previousClass: string | null; applyingForClassId: string | null;
  status: string; testScore: number | null; interviewNotes: string | null; notes: string | null;
  lastSchoolReportUrl: string | null; photoUrl: string | null; convertedStudentId: string | null;
  guardians: Guardian[]; documents: DocItem[]; qualifications: QualItem[];
  createdAt: string; updatedAt: string;
};
type ClassOption = { id: string; name: string };
type SessionOption = { id: string; name: string };
type TabKey = "basic" | "photo" | "contact" | "guardian" | "document" | "qualification";
const emptyAddress: Address = { addressLine1: "", addressLine2: "", city: "", state: "", zipcode: "", country: "" };

const westAfricanCountries: Record<string, string> = {
  nigeria: "Nigeria", ghana: "Ghana", "cote-d-ivoire": "Côte d'Ivoire", senegal: "Senegal",
  mali: "Mali", "burkina-faso": "Burkina Faso", niger: "Niger", "sierra-leone": "Sierra Leone",
  liberia: "Liberia", guinea: "Guinea", "guinea-bissau": "Guinea-Bissau", "the-gambia": "The Gambia",
  togo: "Togo", benin: "Benin", "cape-verde": "Cape Verde",
};

const countryStates: Record<string, string[]> = {
  nigeria: ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"],
  ghana: ["Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"],
  "cote-d-ivoire": ["Abidjan","Bas-Sassandra","Comoé","Denguélé","Gôh-Djiboua","Lacs","Lagunes","Montagnes","Sassandra-Marahoué","Savanes","Vallée du Bandama","Woroba","Yamoussoukro","Zanzan"],
  senegal: ["Dakar","Diourbel","Fatick","Kaffrine","Kaolack","Kédougou","Kolda","Louga","Matam","Saint-Louis","Sédhiou","Tambacounda","Thiès","Ziguinchor"],
  mali: ["Bamako","Gao","Kayes","Kidal","Koulikoro","Mopti","Ségou","Sikasso","Taoudénit","Timbuktu"],
  "burkina-faso": ["Balé","Bam","Banwa","Bazèga","Bougouriba","Boulgou","Boulkiemdé","Comoé","Ganzourgou","Gnagna","Gourma","Houet","Ioba","Kadiogo","Kénédougou","Komondjari","Kompienga","Kossi","Koulpélogo","Kouritenga","Kourwéogo","Léraba","Loroum","Mouhoun","Nahouri","Namentenga","Nayala","Noumbiel","Oubritenga","Oudalan","Passoré","Poni","Sanguié","Sanmatenga","Sissili","Soum","Sourou","Tapoa","Tuy","Yagha","Yatenga","Ziro","Zondoma","Zoundwéogo"],
  niger: ["Agadez","Diffa","Dosso","Maradi","Tahoua","Tillabéri","Zinder","Niamey"],
  "sierra-leone": ["Eastern","Northern","North West","Southern","Western Area"],
  liberia: ["Bomi","Bong","Gbarpolu","Grand Bassa","Grand Cape Mount","Grand Gedeh","Grand Kru","Lofa","Margibi","Maryland","Montserrado","Nimba","River Cess","River Gees","Sinoe"],
  guinea: ["Boké","Conakry","Faranah","Kankan","Kindia","Labé","Mamou","Nzérékoré"],
  "guinea-bissau": ["Bafatá","Biombo","Bissau","Bolama","Cacheu","Gabú","Oio","Quinara","Tombali"],
  "the-gambia": ["Banjul","Central River","Lower River","North Bank","Upper River","West Coast"],
  togo: ["Centrale","Kara","Maritime","Plateaux","Savanes"],
  benin: ["Alibori","Atakora","Atlantique","Borgou","Collines","Couffo","Donga","Littoral","Mono","Ouémé","Plateau","Zou"],
  "cape-verde": ["Boa Vista","Brava","Maio","Mosteiros","Paul","Porto Novo","Praia","Ribeira Brava","Ribeira Grande","Sal","Santa Catarina","Santa Cruz","São Domingos","São Filipe","São Miguel","São Nicolau","São Vicente","Tarrafal"],
};

const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const religions = ["Christianity","Islam","Traditional","Other"];
const guardianRelationships = ["Father","Mother","Sibling","Spouse","Others"];
const idDocumentTypes = ["Passport","National ID","Driver's License","Voter's Card","Birth Certificate","Other"];

export function AdmissionsManager({ userRole }: { userRole?: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [testScoreInput, setTestScoreInput] = useState("");
  const [interviewNotesInput, setInterviewNotesInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [viewTab, setViewTab] = useState<"overview" | "contact" | "guardians" | "documents" | "qualifications">("overview");
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<"PRIVATE" | "REGULAR">("REGULAR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [alternateContactNumber, setAlternateContactNumber] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [nationality, setNationality] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [religion, setReligion] = useState("");
  const [address, setAddress] = useState("");
  const [presentAddress, setPresentAddress] = useState<Address>({ ...emptyAddress });
  const [permanentAddress, setPermanentAddress] = useState<Address>({ ...emptyAddress });
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [previousInstitute, setPreviousInstitute] = useState("");
  const [previousClass, setPreviousClass] = useState("");
  const [applyingForClassId, setApplyingForClassId] = useState("");
  const [notes, setNotes] = useState("");
  const [lastSchoolReportUrl, setLastSchoolReportUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [guardians, setGuardians] = useState<Guardian[]>([{ name: "", email: "", contactNumber: "", relationship: "", isNew: true, occupation: "", employerName: "", workAddress: "", workPhone: "", homeAddress: "", idDocumentType: "", idDocumentNumber: "", idDocumentUrl: "", photoUrl: "", isPrimary: false }]);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [qualifications, setQualifications] = useState<QualItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/admissions", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data?.error ?? "Failed to load applications."); return; }
      setApplications(data.applications ?? []);
      setClasses(data.classes ?? []);
      setSessions(data.sessions ?? []);
    } catch { setStatus("Failed to load data."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => void loadData(), 0); return () => clearTimeout(t); }, [loadData]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filterStatus !== "ALL") list = list.filter((a) => a.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.applicantNumber.toLowerCase().includes(q));
    }
    return list;
  }, [applications, filterStatus, searchQuery]);

  function resetForm() {
    setEditingAppId(null); setActiveTab("basic");
    setSessionId(""); setEnrollmentType("REGULAR");
    setFirstName(""); setLastName(""); setEmail(""); setContactNumber(""); setAlternateContactNumber(""); setAlternateEmail("");
    setGender("MALE"); setDateOfBirth(""); setAge(""); setBirthPlace(""); setNationality(""); setMotherTongue(""); setBloodGroup(""); setReligion("");
    setAddress(""); setPresentAddress({ ...emptyAddress }); setPermanentAddress({ ...emptyAddress }); setSameAsPresent(false);
    setPreviousInstitute(""); setPreviousClass(""); setApplyingForClassId(""); setNotes("");
    setLastSchoolReportUrl(""); setPhotoUrl("");
    setGuardians([{ name: "", email: "", contactNumber: "", relationship: "", isNew: true, occupation: "", employerName: "", workAddress: "", workPhone: "", homeAddress: "", idDocumentType: "", idDocumentNumber: "", idDocumentUrl: "", photoUrl: "", isPrimary: false }]);
    setDocuments([]); setQualifications([]);
  }

  function populateForm(app: Application) {
    setEditingAppId(app.id); setActiveTab("basic");
    setSessionId(app.sessionId ?? ""); setEnrollmentType((app.enrollmentType as any) ?? "REGULAR");
    setFirstName(app.firstName ?? ""); setLastName(app.lastName ?? ""); setEmail(app.email ?? "");
    setContactNumber(app.contactNumber ?? ""); setAlternateContactNumber(app.alternateContactNumber ?? ""); setAlternateEmail(app.alternateEmail ?? "");
    setGender((app.gender as any) ?? "MALE"); setDateOfBirth(app.dateOfBirth ?? ""); setAge(app.age ? String(app.age) : "");
    setBirthPlace(app.birthPlace ?? ""); setNationality(app.nationality ?? ""); setMotherTongue(app.motherTongue ?? "");
    setBloodGroup(app.bloodGroup ?? ""); setReligion(app.religion ?? "");
    setAddress(app.address ?? ""); setPresentAddress(app.presentAddress ?? { ...emptyAddress }); setPermanentAddress(app.permanentAddress ?? { ...emptyAddress });
    setPreviousInstitute(app.previousInstitute ?? ""); setPreviousClass(app.previousClass ?? ""); setApplyingForClassId(app.applyingForClassId ?? "");
    setNotes(app.notes ?? ""); setLastSchoolReportUrl(app.lastSchoolReportUrl ?? ""); setPhotoUrl(app.photoUrl ?? "");
    setGuardians(app.guardians.length > 0 ? app.guardians.map((g) => ({ ...g })) : [{ name: "", email: "", contactNumber: "", relationship: "", isNew: true, occupation: "", employerName: "", workAddress: "", workPhone: "", homeAddress: "", idDocumentType: "", idDocumentNumber: "", idDocumentUrl: "", photoUrl: "", isPrimary: false }]);
    setDocuments(app.documents.length > 0 ? app.documents.map((d) => ({ ...d })) : []);
    setQualifications(app.qualifications.length > 0 ? app.qualifications.map((q) => ({ ...q })) : []);
  }

  function addGuardian() { setGuardians((g) => [...g, { name: "", email: "", contactNumber: "", relationship: "", isNew: true, occupation: "", employerName: "", workAddress: "", workPhone: "", homeAddress: "", idDocumentType: "", idDocumentNumber: "", idDocumentUrl: "", photoUrl: "", isPrimary: false }]); }
  function removeGuardian(i: number) { setGuardians((g) => g.filter((_, idx) => idx !== i)); }
  function updateGuardian(i: number, field: keyof Guardian, value: string | boolean) { setGuardians((g) => g.map((guardian, idx) => (idx === i ? { ...guardian, [field]: value } : guardian))); }

  function addDocument() { setDocuments((d) => [...d, { documentType: "", title: "", issueDate: "", validityStart: "", description: "", fileUrl: "" }]); }
  function removeDocument(i: number) { setDocuments((d) => d.filter((_, idx) => idx !== i)); }
  function updateDocument(i: number, field: keyof DocItem, value: string) { setDocuments((d) => d.map((doc, idx) => (idx === i ? { ...doc, [field]: value } : doc))); }

  function addQualification() { setQualifications((q) => [...q, { qualificationLevel: "", course: "", session: "", institute: "", instituteAddress: "", affiliatedTo: "", startDate: "", endDate: "", result: "", fileUrl: "" }]); }
  function removeQualification(i: number) { setQualifications((q) => q.filter((_, idx) => idx !== i)); }
  function updateQualification(i: number, field: keyof QualItem, value: string) { setQualifications((q) => q.map((qual, idx) => (idx === i ? { ...qual, [field]: value } : qual))); }

  async function handleUpload(file: File, setter: (url: string) => void) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file); formData.append("folder", "admissions");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) { setStatus(data?.error ?? "Upload failed."); return; }
      setter(data.url); setStatus("File uploaded.");
    } catch { setStatus("Upload failed."); }
    finally { setUploading(false); }
  }

  async function handleSubmit() {
    setStatus("");
    if (!firstName.trim() || !lastName.trim() || !email.trim()) { setStatus("First name, last name and email are required."); return; }
    setSubmitting(true);
    const body: Record<string, any> = {
      sessionId: sessionId || null, enrollmentType, firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim().toLowerCase(), contactNumber: contactNumber.trim() || null,
      alternateContactNumber: alternateContactNumber.trim() || null, alternateEmail: alternateEmail.trim().toLowerCase() || null,
      gender, dateOfBirth: dateOfBirth || null, age: age ? Number(age) : null,
      birthPlace: birthPlace.trim() || null, nationality: nationality.trim() || null, motherTongue: motherTongue.trim() || null,
      bloodGroup: bloodGroup.trim() || null, religion: religion.trim() || null, address: address.trim() || null,
      presentAddress: Object.values(presentAddress).some((v) => v) ? presentAddress : null,
      permanentAddress: Object.values(permanentAddress).some((v) => v) ? permanentAddress : null,
      previousInstitute: previousInstitute.trim() || null, previousClass: previousClass.trim() || null,
      applyingForClassId: applyingForClassId || null, notes: notes.trim() || null,
      lastSchoolReportUrl: lastSchoolReportUrl.trim() || null, photoUrl: photoUrl.trim() || null,
      guardians: guardians.filter((g) => g.name.trim()).map((g) => ({
        name: g.name.trim(),
        email: (g.email ?? "").trim() || null,
        contactNumber: (g.contactNumber ?? "").trim() || null,
        relationship: g.relationship.trim(),
        isNew: g.isNew,
        occupation: (g.occupation ?? "").trim() || null,
        employerName: (g.employerName ?? "").trim() || null,
        workAddress: (g.workAddress ?? "").trim() || null,
        workPhone: (g.workPhone ?? "").trim() || null,
        homeAddress: (g.homeAddress ?? "").trim() || null,
        idDocumentType: (g.idDocumentType ?? "").trim() || null,
        idDocumentNumber: (g.idDocumentNumber ?? "").trim() || null,
        idDocumentUrl: (g.idDocumentUrl ?? "").trim() || null,
        photoUrl: (g.photoUrl ?? "").trim() || null,
        isPrimary: g.isPrimary,
      })),
      documents: documents.filter((d) => d.title.trim()).map((d) => ({ documentType: d.documentType.trim() || null, title: d.title.trim(), issueDate: d.issueDate || null, validityStart: d.validityStart || null, description: d.description.trim() || null, fileUrl: d.fileUrl.trim() || null })),
      qualifications: qualifications.filter((q) => q.qualificationLevel.trim() || q.course.trim() || q.institute.trim()).map((q) => ({ qualificationLevel: q.qualificationLevel.trim() || null, course: q.course.trim() || null, session: q.session.trim() || null, institute: q.institute.trim() || null, instituteAddress: q.instituteAddress.trim() || null, affiliatedTo: q.affiliatedTo.trim() || null, startDate: q.startDate || null, endDate: q.endDate || null, result: q.result.trim() || null, fileUrl: q.fileUrl.trim() || null })),
    };
    try {
      const url = editingAppId ? `/api/admin/admissions/${editingAppId}` : "/api/admin/admissions";
      const method = editingAppId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(typeof data?.error === "string" ? data.error : (data?.error?.formErrors?.[0] ?? "Failed to save application.")); return; }
      setStatus(editingAppId ? "Application updated successfully." : "Application created successfully.");
      resetForm(); setShowForm(false); await loadData();
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleStatusUpdate(appId: string, newStatus: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data?.error ?? "Failed to update status."); return; }
      setStatus(`Status updated to ${statusLabels[newStatus]}.`); await loadData();
    } catch { setStatus("An error occurred."); }
  }

  async function handleSaveTest(appId: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testScore: testScoreInput ? Number(testScoreInput) : null, interviewNotes: interviewNotesInput || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data?.error ?? "Failed to save test details."); return; }
      setStatus("Test details saved."); setSelectedApp(null); setTestScoreInput(""); setInterviewNotesInput(""); await loadData();
    } catch { setStatus("An error occurred."); }
  }

  async function handleApprove(appId: string) {
    if (!window.confirm("Approve this application and create a student + guardian record?")) return;
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data?.error ?? "Failed to approve."); return; }
      setStatus("Application approved. Student and guardian accounts created."); await loadData();
    } catch { setStatus("An error occurred."); }
  }

  async function handleWithdraw(appId: string) {
    if (!window.confirm("Withdraw this application?")) return;
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(data?.error ?? "Failed to withdraw."); return; }
      setStatus("Application withdrawn."); await loadData();
    } catch { setStatus("An error occurred."); }
  }

  const isAdmin = userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN";
  const isPrincipal = userRole === "PRINCIPAL";
  const tabs: { key: TabKey; label: string }[] = [
    { key: "basic", label: "Basic" }, { key: "photo", label: "Photo" }, { key: "contact", label: "Contact" },
    { key: "guardian", label: "Guardian" }, { key: "document", label: "Document" }, { key: "qualification", label: "Qualification" },
  ];

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading admissions...</div>;

  return (
    <div className="space-y-6">
      {status && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-sm ${status.includes("success") || status.includes("created") || status.includes("approved") || status.includes("saved") || status.includes("uploaded") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status.includes("failed") || status.includes("error") || status.includes("Unable") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${status.includes("success") || status.includes("created") || status.includes("approved") || status.includes("saved") || status.includes("uploaded") ? "bg-emerald-200 text-emerald-800" : status.includes("failed") || status.includes("error") || status.includes("Unable") ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-800"}`}>
            {status.includes("success") || status.includes("created") || status.includes("approved") || status.includes("saved") || status.includes("uploaded") ? "✓" : status.includes("failed") || status.includes("error") || status.includes("Unable") ? "✕" : "!"}
          </span>
          <span>{status}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Applications ({filtered.length})</h3>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>{showForm ? "Cancel" : "+ New Application"}</Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{editingAppId ? "Edit Application" : "New Application"}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 text-sm font-medium ${activeTab === t.key ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>{t.label}</button>
            ))}
          </div>

          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Session</label><select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)}><option value="">Select session</option>{sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Enrollment Type</label><select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={enrollmentType} onChange={(e) => setEnrollmentType(e.target.value as any)}><option value="REGULAR">Regular</option><option value="PRIVATE">Private</option></select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Applying for Class <span className="text-rose-500">*</span></label><select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={applyingForClassId} onChange={(e) => setApplyingForClassId(e.target.value)}><option value="">Select class</option>{classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">First Name <span className="text-rose-500">*</span></label><Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Last Name <span className="text-rose-500">*</span></label><Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Email <span className="text-rose-500">*</span></label><Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Contact Number <span className="text-rose-500">*</span></label><Input placeholder="Contact number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Gender <span className="text-rose-500">*</span></label><select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={gender} onChange={(e) => setGender(e.target.value as any)}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Birth Date <span className="text-rose-500">*</span></label><Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Age</label><Input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Birth Place</label><Input placeholder="Birth place" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Nationality</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={nationality} onChange={(e) => setNationality(e.target.value)}><option value="">Select country</option>{Object.entries(westAfricanCountries).map(([k,v]) => (<option key={k} value={v}>{v}</option>))}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Mother Tongue</label><Input placeholder="Mother tongue" value={motherTongue} onChange={(e) => setMotherTongue(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Blood Group</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}><option value="">Select blood group</option>{bloodGroups.map((bg) => (<option key={bg} value={bg}>{bg}</option>))}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Religion</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={religion} onChange={(e) => setReligion(e.target.value)}><option value="">Select religion</option>{religions.map((r) => (<option key={r} value={r}>{r}</option>))}</select></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Previous Institute</label><Input placeholder="Previous institute" value={previousInstitute} onChange={(e) => setPreviousInstitute(e.target.value)} /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Previous Class</label><Input placeholder="Previous class" value={previousClass} onChange={(e) => setPreviousClass(e.target.value)} /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Last School Report</label><div className="flex items-center gap-2"><Input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, setLastSchoolReportUrl); }} />{lastSchoolReportUrl && <a href={lastSchoolReportUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View</a>}</div></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Remarks / Notes</label><textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." /></div>
              </div>
            </div>
          )}

          {activeTab === "photo" && (
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-medium text-slate-700">Student Photo</label><div className="flex items-center gap-3"><Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, setPhotoUrl); }} />{photoUrl && <img src={photoUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover" />}</div>{photoUrl && <p className="mt-1 text-xs text-slate-500">{photoUrl}</p>}</div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Alternate Contact</label><Input placeholder="Alternate contact" value={alternateContactNumber} onChange={(e) => setAlternateContactNumber(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Alternate Email</label><Input type="email" placeholder="Alternate email" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">General Address</label><Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3"><h4 className="mb-2 text-sm font-semibold text-slate-800">Present Address</h4><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Address Line 1</label><Input value={presentAddress.addressLine1} onChange={(e) => setPresentAddress((a) => ({ ...a, addressLine1: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Address Line 2</label><Input value={presentAddress.addressLine2} onChange={(e) => setPresentAddress((a) => ({ ...a, addressLine2: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">City</label><Input value={presentAddress.city} onChange={(e) => setPresentAddress((a) => ({ ...a, city: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">State</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={presentAddress.state} onChange={(e) => setPresentAddress((a) => ({ ...a, state: e.target.value }))}><option value="">Select state</option>{(() => { const slug = Object.entries(westAfricanCountries).find(([,v]) => v === presentAddress.country)?.[0]; return (slug && countryStates[slug] ? countryStates[slug] : []).map((s) => (<option key={s} value={s}>{s}</option>)); })()}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Zipcode</label><Input value={presentAddress.zipcode} onChange={(e) => setPresentAddress((a) => ({ ...a, zipcode: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Country</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={presentAddress.country} onChange={(e) => setPresentAddress((a) => ({ ...a, country: e.target.value, state: "" }))}><option value="">Select country</option>{Object.entries(westAfricanCountries).map(([k,v]) => (<option key={k} value={v}>{v}</option>))}</select></div>
              </div></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="sameAsPresent" checked={sameAsPresent} onChange={(e) => { const checked = e.target.checked; setSameAsPresent(checked); if (checked) setPermanentAddress({ ...presentAddress }); }} className="h-4 w-4 rounded border-slate-300" /><label htmlFor="sameAsPresent" className="text-xs text-slate-700">Same as present address</label></div>
              <div className="rounded-lg border border-slate-200 p-3"><h4 className="mb-2 text-sm font-semibold text-slate-800">Permanent Address</h4><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Address Line 1</label><Input value={permanentAddress.addressLine1} onChange={(e) => setPermanentAddress((a) => ({ ...a, addressLine1: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Address Line 2</label><Input value={permanentAddress.addressLine2} onChange={(e) => setPermanentAddress((a) => ({ ...a, addressLine2: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">City</label><Input value={permanentAddress.city} onChange={(e) => setPermanentAddress((a) => ({ ...a, city: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">State</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={permanentAddress.state} onChange={(e) => setPermanentAddress((a) => ({ ...a, state: e.target.value }))}><option value="">Select state</option>{(() => { const slug = Object.entries(westAfricanCountries).find(([,v]) => v === permanentAddress.country)?.[0]; return (slug && countryStates[slug] ? countryStates[slug] : []).map((s) => (<option key={s} value={s}>{s}</option>)); })()}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Zipcode</label><Input value={permanentAddress.zipcode} onChange={(e) => setPermanentAddress((a) => ({ ...a, zipcode: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-700">Country</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={permanentAddress.country} onChange={(e) => setPermanentAddress((a) => ({ ...a, country: e.target.value, state: "" }))}><option value="">Select country</option>{Object.entries(westAfricanCountries).map(([k,v]) => (<option key={k} value={v}>{v}</option>))}</select></div>
              </div></div>
            </div>
          )}

          {activeTab === "guardian" && (
            <div className="space-y-4">
              {guardians.map((g, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-slate-700">Guardian {i + 1}</span>{guardians.length > 1 && <button onClick={() => removeGuardian(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Name <span className="text-rose-500">*</span></label><Input value={g.name} onChange={(e) => updateGuardian(i, "name", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Relationship <span className="text-rose-500">*</span></label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={g.relationship} onChange={(e) => updateGuardian(i, "relationship", e.target.value)}><option value="">Select relationship</option>{guardianRelationships.map((r) => (<option key={r} value={r}>{r}</option>))}</select></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Email</label><Input type="email" value={g.email ?? ""} onChange={(e) => updateGuardian(i, "email", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Contact</label><Input value={g.contactNumber ?? ""} onChange={(e) => updateGuardian(i, "contactNumber", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Occupation</label><Input value={g.occupation ?? ""} onChange={(e) => updateGuardian(i, "occupation", e.target.value)} placeholder="e.g. Engineer" /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Employer / Place of Work</label><Input value={g.employerName ?? ""} onChange={(e) => updateGuardian(i, "employerName", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Work Phone</label><Input value={g.workPhone ?? ""} onChange={(e) => updateGuardian(i, "workPhone", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Work Address</label><Input value={g.workAddress ?? ""} onChange={(e) => updateGuardian(i, "workAddress", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Home Address</label><Input value={g.homeAddress ?? ""} onChange={(e) => updateGuardian(i, "homeAddress", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">ID Document Type</label><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={g.idDocumentType ?? ""} onChange={(e) => updateGuardian(i, "idDocumentType", e.target.value)}><option value="">Select type</option>{idDocumentTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">ID Document Number</label><Input value={g.idDocumentNumber ?? ""} onChange={(e) => updateGuardian(i, "idDocumentNumber", e.target.value)} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">ID Document File</label><div className="flex items-center gap-2"><Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, (url) => updateGuardian(i, "idDocumentUrl", url)); }} />{g.idDocumentUrl && <a href={g.idDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View</a>}</div></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Guardian Photo</label><div className="flex items-center gap-2"><Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, (url) => updateGuardian(i, "photoUrl", url)); }} />{g.photoUrl && <img src={g.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}</div></div>
                    <div className="flex items-center gap-2 pt-5"><input type="checkbox" id={`primary-${i}`} checked={g.isPrimary} onChange={(e) => updateGuardian(i, "isPrimary", e.target.checked)} className="h-4 w-4 rounded border-slate-300" /><label htmlFor={`primary-${i}`} className="text-xs text-slate-700">Primary guardian</label></div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGuardian}><Plus className="mr-1 h-4 w-4" /> Add Guardian</Button>
            </div>
          )}

          {activeTab === "document" && (
            <div className="space-y-4">
              {documents.map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-slate-700">Document {i + 1}</span>{documents.length > 0 && <button onClick={() => removeDocument(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Title</label><Input value={d.title} onChange={(e) => updateDocument(i, "title", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Type</label><Input value={d.documentType} onChange={(e) => updateDocument(i, "documentType", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Issue Date</label><Input type="date" value={d.issueDate} onChange={(e) => updateDocument(i, "issueDate", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Validity Start</label><Input type="date" value={d.validityStart} onChange={(e) => updateDocument(i, "validityStart", e.target.value)} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Description</label><Input value={d.description} onChange={(e) => updateDocument(i, "description", e.target.value)} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">File</label><div className="flex items-center gap-2"><Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, (url) => updateDocument(i, "fileUrl", url)); }} />{d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View</a>}</div></div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDocument}><Plus className="mr-1 h-4 w-4" /> Add Document</Button>
            </div>
          )}

          {activeTab === "qualification" && (
            <div className="space-y-4">
              {qualifications.map((q, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-slate-700">Qualification {i + 1}</span>{qualifications.length > 0 && <button onClick={() => removeQualification(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Level</label><Input value={q.qualificationLevel} onChange={(e) => updateQualification(i, "qualificationLevel", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Course</label><Input value={q.course} onChange={(e) => updateQualification(i, "course", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Session</label><Input value={q.session} onChange={(e) => updateQualification(i, "session", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Institute</label><Input value={q.institute} onChange={(e) => updateQualification(i, "institute", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Institute Address</label><Input value={q.instituteAddress} onChange={(e) => updateQualification(i, "instituteAddress", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Affiliated To</label><Input value={q.affiliatedTo} onChange={(e) => updateQualification(i, "affiliatedTo", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Start Date</label><Input type="date" value={q.startDate} onChange={(e) => updateQualification(i, "startDate", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">End Date</label><Input type="date" value={q.endDate} onChange={(e) => updateQualification(i, "endDate", e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-slate-700">Result</label><Input value={q.result} onChange={(e) => updateQualification(i, "result", e.target.value)} /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1 block text-xs font-medium text-slate-700">Certificate File</label><div className="flex items-center gap-2"><Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, (url) => updateQualification(i, "fileUrl", url)); }} />{q.fileUrl && <a href={q.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View</a>}</div></div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addQualification}><Plus className="mr-1 h-4 w-4" /> Add Qualification</Button>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleSubmit} disabled={submitting || uploading}>{submitting ? "Saving..." : editingAppId ? "Update Application" : "Create Application"}</Button>
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" /><Input placeholder="Search by name, email, number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-sm" /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All Status</option>{pipelineStatuses.map((s) => (<option key={s} value={s}>{statusLabels[s]}</option>))}</select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pipelineStatuses.map((s) => {
          const list = filtered.filter((a) => a.status === s);
          if (!list.length) return null;
          return (
            <div key={s} className="rounded-xl border border-slate-200 bg-white">
              <div className={`rounded-t-xl px-4 py-2 text-xs font-semibold ${statusColors[s]}`}>{statusLabels[s]} ({list.length})</div>
              <div className="max-h-96 overflow-y-auto p-2">
                {list.map((app) => (
                  <div key={app.id} className="mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between"><div className="text-xs font-semibold text-slate-900">{app.name}</div><div className="text-[10px] text-slate-500">{app.applicantNumber}</div></div>
                    <div className="text-xs text-slate-600">{app.email}</div>
                    <div className="mt-1 text-[10px] text-slate-500">Class: {classes.find((c) => c.id === String(app.applyingForClassId))?.name ?? "—"}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button onClick={() => setViewingApp(app)} className="rounded bg-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-300">View</button>
                      <button onClick={() => { populateForm(app); setShowForm(true); }} className="rounded bg-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-200">Edit</button>
                      {isAdmin && app.status === "PENDING" && <button onClick={() => handleStatusUpdate(app.id, "TESTED")} className="rounded bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-200">Route to Test</button>}
                      {app.status === "PENDING" && <button onClick={() => { setSelectedApp(app); setTestScoreInput(app.testScore ? String(app.testScore) : ""); setInterviewNotesInput(app.interviewNotes ?? ""); }} className="rounded bg-violet-100 px-2 py-1 text-[10px] font-medium text-violet-700 hover:bg-violet-200">Test / Interview</button>}
                      {(isAdmin || isPrincipal) && (app.status === "TESTED" || app.status === "INTERVIEWED") && <button onClick={() => handleApprove(app.id)} className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-200">Approve</button>}
                      {(isAdmin || isPrincipal) && app.status === "APPROVED" && !app.convertedStudentId && <button onClick={() => handleApprove(app.id)} className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-200">Create Student</button>}
                      {app.status !== "WITHDRAWN" && app.status !== "APPROVED" && app.status !== "REJECTED" && <button onClick={() => handleWithdraw(app.id)} className="rounded bg-rose-100 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-200">Withdraw</button>}
                      {app.status !== "WITHDRAWN" && app.status !== "APPROVED" && app.status !== "REJECTED" && <button onClick={() => handleStatusUpdate(app.id, "REJECTED")} className="rounded bg-rose-100 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-200">Reject</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Test & Interview: {selectedApp.name}</h3>
            <div className="space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-slate-700">Test Score (0-100)</label><Input type="number" value={testScoreInput} onChange={(e) => setTestScoreInput(e.target.value)} placeholder="Enter test score" /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-700">Interview Notes</label><textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} value={interviewNotesInput} onChange={(e) => setInterviewNotesInput(e.target.value)} placeholder="Interview observations..." /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSelectedApp(null); setTestScoreInput(""); setInterviewNotesInput(""); }}>Close</Button>
              <Button size="sm" onClick={() => handleSaveTest(selectedApp.id)}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50/80 p-6">
              {viewingApp.photoUrl ? (
                <img src={viewingApp.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-sm" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">
                  {viewingApp.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{viewingApp.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColors[viewingApp.status]}`}>{statusLabels[viewingApp.status]}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{viewingApp.email}</span>
                  <span>·</span>
                  <span>Applicant {viewingApp.applicantNumber}</span>
                  <span>·</span>
                  <span>{viewingApp.gender ?? "—"}</span>
                  <span>·</span>
                  <span>Age {viewingApp.age ?? "—"}</span>
                </div>
              </div>
              <button onClick={() => { setViewingApp(null); setViewTab("overview"); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-100 bg-white px-6 pt-3">
              {(["overview", "contact", "guardians", "documents", "qualifications"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setViewTab(t)}
                  className={`rounded-t-lg px-4 py-2 text-xs font-semibold capitalize transition-colors ${viewTab === t ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Personal</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Full Name</span><span className="font-medium text-slate-900">{viewingApp.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date of Birth</span><span className="font-medium text-slate-900">{viewingApp.dateOfBirth ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Age</span><span className="font-medium text-slate-900">{viewingApp.age ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Gender</span><span className="font-medium text-slate-900">{viewingApp.gender ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Birth Place</span><span className="font-medium text-slate-900">{viewingApp.birthPlace ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Nationality</span><span className="font-medium text-slate-900">{viewingApp.nationality ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Mother Tongue</span><span className="font-medium text-slate-900">{viewingApp.motherTongue ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Blood Group</span><span className="font-medium text-slate-900">{viewingApp.bloodGroup ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Religion</span><span className="font-medium text-slate-900">{viewingApp.religion ?? "—"}</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Applying For</span><span className="font-medium text-slate-900">{classes.find((c) => c.id === String(viewingApp.applyingForClassId))?.name ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Previous Institute</span><span className="font-medium text-slate-900">{viewingApp.previousInstitute ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Previous Class</span><span className="font-medium text-slate-900">{viewingApp.previousClass ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Last Report</span><span className="font-medium text-slate-900">{viewingApp.lastSchoolReportUrl ? <a href={viewingApp.lastSchoolReportUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View</a> : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Test Score</span><span className="font-medium text-slate-900">{viewingApp.testScore ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${statusColors[viewingApp.status]}`}>{statusLabels[viewingApp.status]}</span></div>
                      </div>
                    </div>
                  </div>
                  {viewingApp.interviewNotes && (
                    <div className="rounded-xl border border-slate-100 bg-amber-50/40 p-4">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">Interview Notes</div>
                      <p className="text-sm text-slate-700">{viewingApp.interviewNotes}</p>
                    </div>
                  )}
                  {viewingApp.notes && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">General Notes</div>
                      <p className="text-sm text-slate-700">{viewingApp.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {viewTab === "contact" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{viewingApp.email}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{viewingApp.contactNumber ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Alternate Phone</span><span className="font-medium text-slate-900">{viewingApp.alternateContactNumber ?? "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Alternate Email</span><span className="font-medium text-slate-900">{viewingApp.alternateEmail ?? "—"}</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Present Address</div>
                      <div className="space-y-1 text-sm text-slate-700">
                        {viewingApp.presentAddress ? (
                          <>
                            <div>{viewingApp.presentAddress.addressLine1}{viewingApp.presentAddress.addressLine2 ? `, ${viewingApp.presentAddress.addressLine2}` : ""}</div>
                            <div>{viewingApp.presentAddress.city}, {viewingApp.presentAddress.state} {viewingApp.presentAddress.zipcode}</div>
                            <div>{viewingApp.presentAddress.country}</div>
                          </>
                        ) : (
                          <div className="text-slate-400">Not provided</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Permanent Address</div>
                      <div className="space-y-1 text-sm text-slate-700">
                        {viewingApp.permanentAddress ? (
                          <>
                            <div>{viewingApp.permanentAddress.addressLine1}{viewingApp.permanentAddress.addressLine2 ? `, ${viewingApp.permanentAddress.addressLine2}` : ""}</div>
                            <div>{viewingApp.permanentAddress.city}, {viewingApp.permanentAddress.state} {viewingApp.permanentAddress.zipcode}</div>
                            <div>{viewingApp.permanentAddress.country}</div>
                          </>
                        ) : (
                          <div className="text-slate-400">Not provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewTab === "guardians" && (
                <div className="space-y-3">
                  {viewingApp.guardians.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center text-sm text-slate-400">No guardians recorded.</div>
                  ) : (
                    viewingApp.guardians.map((g, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{g.name.charAt(0)}</div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{g.name}</div>
                              <div className="text-xs text-slate-500 capitalize">{g.relationship}</div>
                            </div>
                          </div>
                          {g.isNew && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">New</span>}
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          {g.email && <div><span className="text-slate-400">Email:</span> {g.email}</div>}
                          {g.contactNumber && <div><span className="text-slate-400">Phone:</span> {g.contactNumber}</div>}
                          {g.occupation && <div><span className="text-slate-400">Occupation:</span> {g.occupation}</div>}
                          {g.employerName && <div><span className="text-slate-400">Employer:</span> {g.employerName}</div>}
                          {g.workPhone && <div><span className="text-slate-400">Work Phone:</span> {g.workPhone}</div>}
                          {g.workAddress && <div><span className="text-slate-400">Work Address:</span> {g.workAddress}</div>}
                          {g.homeAddress && <div><span className="text-slate-400">Home Address:</span> {g.homeAddress}</div>}
                          {g.idDocumentType && <div><span className="text-slate-400">ID Type:</span> {g.idDocumentType}</div>}
                          {g.idDocumentNumber && <div><span className="text-slate-400">ID Number:</span> {g.idDocumentNumber}</div>}
                          {g.idDocumentUrl && <div><a href={g.idDocumentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View ID Document</a></div>}
                          {g.isPrimary && <div><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Primary Guardian</span></div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewTab === "documents" && (
                <div className="space-y-3">
                  {viewingApp.documents.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center text-sm text-slate-400">No documents uploaded.</div>
                  ) : (
                    viewingApp.documents.map((d, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-lg">📄</div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{d.title}</div>
                            <div className="text-xs text-slate-500">{d.documentType ?? "Document"} · {d.issueDate ? new Date(d.issueDate).toLocaleDateString() : "No date"}</div>
                          </div>
                        </div>
                        {d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">View</a> : <span className="text-xs text-slate-400">No file</span>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewTab === "qualifications" && (
                <div className="space-y-3">
                  {viewingApp.qualifications.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center text-sm text-slate-400">No qualifications recorded.</div>
                  ) : (
                    viewingApp.qualifications.map((q, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-lg">🎓</div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{q.qualificationLevel ?? "Qualification"}{q.course ? ` — ${q.course}` : ""}</div>
                              <div className="text-xs text-slate-500">{q.institute ?? "—"}{q.instituteAddress ? ` · ${q.instituteAddress}` : ""}</div>
                            </div>
                          </div>
                          {q.result && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{q.result}</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          {q.session && <span><span className="text-slate-400">Session:</span> {q.session}</span>}
                          {q.affiliatedTo && <span><span className="text-slate-400">Affiliated:</span> {q.affiliatedTo}</span>}
                          {(q.startDate || q.endDate) && <span><span className="text-slate-400">Period:</span> {q.startDate ?? "—"} to {q.endDate ?? "—"}</span>}
                          {q.fileUrl && <a href={q.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View Certificate</a>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
