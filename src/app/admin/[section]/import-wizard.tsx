"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

type ImportType = "students" | "parents" | "staff";

type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
};

type RowData = Record<string, unknown>;

const STUDENT_FIELDS: FieldDef[] = [
  { key: "firstName", label: "First Name", required: true, aliases: ["firstname", "fname", "givenname", "first"] },
  { key: "middleName", label: "Middle Name", required: false, aliases: ["middlename", "mname", "middle"] },
  { key: "lastName", label: "Last Name", required: true, aliases: ["lastname", "lname", "surname", "last"] },
  { key: "email", label: "Email", required: true, aliases: ["email", "emailaddress", "emailaddress"] },
  { key: "gender", label: "Gender (MALE/FEMALE/OTHER)", required: true, aliases: ["gender", "sex"] },
  { key: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", required: false, aliases: ["dateofbirth", "dob", "birthdate", "birthday"] },
  { key: "age", label: "Age", required: false, aliases: ["age"] },
  { key: "className", label: "Class Name", required: false, aliases: ["class", "classname", "classgroup", "grade"] },
  { key: "admissionNo", label: "Admission Number", required: false, aliases: ["admissionno", "admissionnumber", "admission", "regno", "registrationnumber"] },
  { key: "guardianName", label: "Guardian Name", required: false, aliases: ["guardianname", "parentname", "guardian", "parent"] },
  { key: "guardianEmail", label: "Guardian Email", required: false, aliases: ["guardianemail", "parentemail", "guardianemailaddress"] },
  { key: "guardianPhone", label: "Guardian Phone", required: false, aliases: ["guardianphone", "parentphone", "phone"] },
  { key: "guardianRelationship", label: "Guardian Relationship", required: false, aliases: ["guardianrelationship", "relationship", "relation"] },
  { key: "sportHouse", label: "Sport House", required: false, aliases: ["sporthouse", "house"] },
];

const PARENT_FIELDS: FieldDef[] = [
  { key: "name", label: "Full Name", required: true, aliases: ["name", "fullname", "parentname", "guardianname"] },
  { key: "email", label: "Email", required: true, aliases: ["email", "emailaddress"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "phonenumber", "mobile", "contact"] },
  { key: "occupation", label: "Occupation", required: false, aliases: ["occupation", "job", "profession"] },
  { key: "homeAddress", label: "Home Address", required: false, aliases: ["homeaddress", "address", "residentialaddress"] },
];

const STAFF_FIELDS: FieldDef[] = [
  { key: "name", label: "Full Name", required: true, aliases: ["name", "fullname", "staffname"] },
  { key: "email", label: "Email", required: true, aliases: ["email", "emailaddress"] },
  { key: "designation", label: "Designation (CLASS_TEACHER/SUBJECT_TEACHER/HEAD_OF_DEPARTMENT/HEAD_TEACHER)", required: false, aliases: ["designation", "position", "role", "title"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "phonenumber", "mobile", "contact"] },
  { key: "className", label: "Class Group (for HOD/HT)", required: false, aliases: ["classgroup", "class", "department"] },
];

const FIELDS_BY_TYPE: Record<ImportType, FieldDef[]> = {
  students: STUDENT_FIELDS,
  parents: PARENT_FIELDS,
  staff: STAFF_FIELDS,
};

const STUDENT_SAMPLE: RowData[] = [
  {
    firstName: "Chidi",
    middleName: "Obi",
    lastName: "Okafor",
    email: "chidi.okafor@student.sckool.com",
    gender: "MALE",
    dateOfBirth: "2015-03-15",
    age: 10,
    className: "JSS 1",
    admissionNo: "ADM/2025/001",
    guardianName: "Emeka Okafor",
    guardianEmail: "emeka.okafor@gmail.com",
    guardianPhone: "08031234567",
    guardianRelationship: "Father",
    sportHouse: "Red",
  },
  {
    firstName: "Aisha",
    middleName: "",
    lastName: "Bello",
    email: "aisha.bello@student.sckool.com",
    gender: "FEMALE",
    dateOfBirth: "2014-08-22",
    age: 11,
    className: "JSS 2",
    admissionNo: "ADM/2025/002",
    guardianName: "Fatima Bello",
    guardianEmail: "fatima.bello@gmail.com",
    guardianPhone: "08039876543",
    guardianRelationship: "Mother",
    sportHouse: "Blue",
  },
  {
    firstName: "Tunde",
    middleName: "Ade",
    lastName: "Adeyemi",
    email: "tunde.adeyemi@student.sckool.com",
    gender: "MALE",
    dateOfBirth: "2016-01-10",
    age: 9,
    className: "Primary 5",
    admissionNo: "ADM/2025/003",
    guardianName: "Bola Adeyemi",
    guardianEmail: "bola.adeyemi@yahoo.com",
    guardianPhone: "08055551234",
    guardianRelationship: "Mother",
    sportHouse: "Green",
  },
];

const PARENT_SAMPLE: RowData[] = [
  {
    name: "Emeka Okafor",
    email: "emeka.okafor@gmail.com",
    phone: "08031234567",
    occupation: "Civil Engineer",
    homeAddress: "12 Allen Avenue, Ikeja, Lagos",
  },
  {
    name: "Fatima Bello",
    email: "fatima.bello@gmail.com",
    phone: "08039876543",
    occupation: "Pharmacist",
    homeAddress: "5 Wuse 2, Abuja",
  },
  {
    name: "Bola Adeyemi",
    email: "bola.adeyemi@yahoo.com",
    phone: "08055551234",
    occupation: "Teacher",
    homeAddress: "8 Bodija Road, Ibadan",
  },
];

const STAFF_SAMPLE: RowData[] = [
  {
    name: "Dr. Ngozi Eze",
    email: "ngozi.eze@sckool.com",
    designation: "HEAD_OF_DEPARTMENT",
    phone: "08011112222",
    className: "Science",
  },
  {
    name: "Mr. Samuel Adeniyi",
    email: "samuel.adeniyi@sckool.com",
    designation: "CLASS_TEACHER",
    phone: "08022223333",
    className: "",
  },
  {
    name: "Mrs. Grace Okon",
    email: "grace.okon@sckool.com",
    designation: "SUBJECT_TEACHER",
    phone: "08033334444",
    className: "",
  },
];

const SAMPLE_DATA: Record<ImportType, RowData[]> = {
  students: STUDENT_SAMPLE,
  parents: PARENT_SAMPLE,
  staff: STAFF_SAMPLE,
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoDetectMapping(excelHeaders: string[], fields: FieldDef[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const normalizedAliases = field.aliases.map(normalizeKey);
    let matched = "";
    for (const header of excelHeaders) {
      const nh = normalizeKey(header);
      if (normalizedAliases.includes(nh)) {
        matched = header;
        break;
      }
    }
    if (!matched) {
      for (const header of excelHeaders) {
        const nh = normalizeKey(header);
        if (normalizedAliases.some((alias) => nh.includes(alias) || alias.includes(nh))) {
          matched = header;
          break;
        }
      }
    }
    mapping[field.key] = matched;
  }
  return mapping;
}

function downloadExcelTemplate(type: ImportType) {
  const fields = FIELDS_BY_TYPE[type];
  const sampleRows = SAMPLE_DATA[type];
  const headers = fields.map((f) => f.label);
  const aoa: (string | number)[][] = [headers];
  for (const row of sampleRows) {
    const dataRow: (string | number)[] = fields.map((f) => {
      const val = row[f.key];
      if (val === undefined || val === null) return "";
      return typeof val === "number" ? val : String(val);
    });
    aoa.push(dataRow);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(f.label.length + 2, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
  XLSX.writeFile(wb, `${type}-import-template.xlsx`);
}

export function ImportWizard({ section }: { section: ImportType }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState<ImportType>(section);
  const [parsedRows, setParsedRows] = useState<RowData[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const fields = FIELDS_BY_TYPE[activeType];

  const resetState = useCallback(() => {
    setParsedRows([]);
    setExcelHeaders([]);
    setColumnMapping({});
    setFileName("");
    setStatus("");
    setImportResult(null);
  }, []);

  function handleFileUpload(file: File) {
    setStatus("");
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          setStatus("Failed to read file.");
          return;
        }
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          setStatus("No sheets found in the Excel file.");
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<RowData>(sheet, { defval: "" });
        if (rows.length === 0) {
          setStatus("The Excel sheet has no data rows.");
          return;
        }
        const headers = Object.keys(rows[0]);
        setParsedRows(rows);
        setExcelHeaders(headers);
        setColumnMapping(autoDetectMapping(headers, FIELDS_BY_TYPE[activeType]));
        setFileName(file.name);
        setStatus(`Loaded ${rows.length} rows from ${file.name}`);
      } catch {
        setStatus("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function getMappedRows(): Record<string, unknown>[] {
    return parsedRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const field of fields) {
        const excelCol = columnMapping[field.key];
        if (excelCol) {
          mapped[field.key] = row[excelCol] ?? "";
        }
      }
      return mapped;
    });
  }

  function validateRows(rows: Record<string, unknown>[]): string[] {
    const errors: string[] = [];
    rows.forEach((row, idx) => {
      for (const field of fields) {
        if (field.required) {
          const val = row[field.key];
          if (val === undefined || val === null || String(val).trim() === "") {
            errors.push(`Row ${idx + 1}: Missing required field "${field.label}"`);
          }
        }
      }
      if (row.email) {
        const email = String(row.email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${idx + 1}: Invalid email "${email}"`);
        }
      }
      if (activeType === "students" && row.gender) {
        const g = String(row.gender).trim().toUpperCase();
        if (!["MALE", "FEMALE", "OTHER"].includes(g)) {
          errors.push(`Row ${idx + 1}: Gender must be MALE, FEMALE, or OTHER (got "${g}")`);
        }
      }
    });
    return errors;
  }

  async function handleImport() {
    const rows = getMappedRows();
    if (rows.length === 0) {
      setStatus("No rows to import.");
      return;
    }

    const validationErrors = validateRows(rows);
    if (validationErrors.length > 0) {
      setStatus(`Validation failed with ${validationErrors.length} error(s). See below.`);
      setImportResult({
        total: rows.length,
        success: 0,
        failed: rows.length,
        errors: validationErrors.slice(0, 20),
      });
      return;
    }

    setImporting(true);
    setStatus("Importing...");
    setImportResult(null);

    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, rows }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Import failed.");
        setImportResult({
          total: rows.length,
          success: 0,
          failed: rows.length,
          errors: [payload?.error ?? "Unknown error"],
        });
        return;
      }
      const result = payload.result ?? payload;
      setStatus(`Import complete: ${result.success} succeeded, ${result.failed} failed.`);
      setImportResult(result);
      if (result.success > 0) {
        setParsedRows([]);
        setExcelHeaders([]);
        setColumnMapping({});
        setFileName("");
      }
    } catch {
      setStatus("An error occurred during import.");
    } finally {
      setImporting(false);
    }
  }

  function switchType(type: ImportType) {
    setActiveType(type);
    resetState();
  }

  const mappedRows = parsedRows.length > 0 ? getMappedRows().slice(0, 5) : [];
  const previewFields = fields.filter((f) => columnMapping[f.key]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Bulk Import Wizard</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Download a template, fill in your data, upload it back, map columns, and import.
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {(["students", "parents", "staff"] as ImportType[]).map((t) => (
          <button
            key={t}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              activeType === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => switchType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Step 1: Download template */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-2">Step 1: Download Sample Template</p>
        <p className="text-xs text-slate-500 mb-2">
          Download an Excel template with sample data for {activeType}. Replace the sample rows with your own data and upload it.
        </p>
        <Button size="sm" variant="outline" onClick={() => downloadExcelTemplate(activeType)}>
          Download {activeType.charAt(0).toUpperCase() + activeType.slice(1)} Template (.xlsx)
        </Button>
      </div>

      {/* Step 2: Upload file */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-2">Step 2: Upload Your Excel File</p>
        <div className="flex items-center gap-3">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="max-w-sm"
          />
          {fileName && (
            <span className="text-xs text-slate-600">
              Loaded: <strong>{fileName}</strong> ({parsedRows.length} rows)
            </span>
          )}
        </div>
      </div>

      {/* Step 3: Column mapping */}
      {excelHeaders.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Step 3: Map Columns</p>
          <p className="text-xs text-slate-500 mb-3">
            We auto-detected column mappings. Review and adjust if needed. Unmapped required fields will cause validation errors.
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-rose-500"> *</span>}
                </label>
                <select
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={columnMapping[field.key] ?? ""}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                >
                  <option value="">— Not mapped —</option>
                  {excelHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {mappedRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Step 4: Preview (first {Math.min(5, mappedRows.length)} of {parsedRows.length} rows)
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-1">#</th>
                  {previewFields.map((f) => (
                    <th key={f.key} className="px-2 py-1 whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappedRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                    {previewFields.map((f) => (
                      <td key={f.key} className="px-2 py-1 text-slate-700 whitespace-nowrap">
                        {String(row[f.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 5: Import */}
      {parsedRows.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : `Import ${parsedRows.length} ${activeType}`}
          </Button>
          <Button variant="outline" onClick={resetState}>
            Reset
          </Button>
        </div>
      )}

      {/* Status */}
      {status && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            status.includes("complete") || status.includes("succeeded") || status.includes("Loaded")
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : status.includes("failed") || status.includes("error") || status.includes("Validation")
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {status}
        </div>
      )}

      {/* Import results */}
      {importResult && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="flex gap-4 text-sm">
            <span className="text-slate-600">Total: <strong>{importResult.total}</strong></span>
            <span className="text-emerald-600">Succeeded: <strong>{importResult.success}</strong></span>
            <span className="text-rose-600">Failed: <strong>{importResult.failed}</strong></span>
          </div>
          {importResult.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded bg-rose-50 p-2 text-xs text-rose-700">
              <ul className="space-y-0.5">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
