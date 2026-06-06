import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// Helper function for queries
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

// Helper for single row queries
export async function queryOne<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] || null;
}

// Helper for many rows
export async function queryMany<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

// Transaction helper - supports both callback and array forms
export async function withTransaction<T>(
  callback: ((client: any) => Promise<T>) | Promise<any>[]
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let result: T | any[];
    if (Array.isArray(callback)) {
      result = await Promise.all(callback);
    } else {
      result = await callback(client);
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// For direct client access
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================================================
// PRISMA COMPATIBILITY SHIM
// This provides a Prisma-like API for easier migration
// ============================================================================

// Helper to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to build WHERE clauses with operator support
function buildWhere(where: Record<string, any>, paramOffset = 0): { clause: string; values: any[] } {
  const entries = Object.entries(where).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) return { clause: "", values: [] };

  const values: any[] = [];
  const conditions: string[] = [];
  let paramIndex = paramOffset;

  function pushValue(v: any) {
    paramIndex++;
    values.push(v);
    return `$${paramIndex}`;
  }

  function processEntry(key: string, val: any): string {
    // Handle OR array
    if (key === "OR" && Array.isArray(val)) {
      const orParts = val
        .map((item) => {
          const sub = buildWhere(item, paramIndex);
          paramIndex += sub.values.length;
          values.push(...sub.values);
          return sub.clause.replace(/^WHERE /, "");
        })
        .filter(Boolean);
      return orParts.length ? `(${orParts.join(" OR ")})` : "1=1";
    }

    // Handle composite key object like { schoolId_key: { schoolId, key } }
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      const keys = Object.keys(val);
      if (!keys.includes("not") && !keys.includes("in") && !keys.includes("lt") && !keys.includes("lte") && !keys.includes("gt") && !keys.includes("gte") && !keys.includes("startsWith")) {
        // It's a composite key or relation filter — build nested AND
        const subEntries = Object.entries(val).filter(([_, v]) => v !== undefined);
        const subParts = subEntries.map(([subKey, subVal]) => {
          const col = toSnakeCase(subKey);
          return `${col} = ${pushValue(subVal)}`;
        });
        return subParts.join(" AND ");
      }
    }

    const column = toSnakeCase(key);

    if (val === null) {
      return `${column} IS NULL`;
    }

    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      // Operator object — accumulate all recognized operators
      const ops: string[] = [];
      if ("not" in val) {
        if (val.not === null) ops.push(`${column} IS NOT NULL`);
        else ops.push(`${column} != ${pushValue(val.not)}`);
      }
      if ("in" in val && Array.isArray(val.in)) {
        ops.push(`${column} = ANY(${pushValue(val.in)})`);
      }
      if ("lt" in val) ops.push(`${column} < ${pushValue(val.lt)}`);
      if ("lte" in val) ops.push(`${column} <= ${pushValue(val.lte)}`);
      if ("gt" in val) ops.push(`${column} > ${pushValue(val.gt)}`);
      if ("gte" in val) ops.push(`${column} >= ${pushValue(val.gte)}`);
      if ("startsWith" in val) ops.push(`${column} LIKE ${pushValue(val.startsWith + "%")}`);
      if (ops.length > 0) return ops.join(" AND ");
    }

    return `${column} = ${pushValue(val)}`;
  }

  for (const [key, val] of entries) {
    const cond = processEntry(key, val);
    if (cond) conditions.push(cond);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

// Relation map for include post-processing
const relationMap: Record<string, Record<string, { table: string; fk: string; parentKey: string; type: "one" | "many" }>> = {
  student: {
    user: { table: '"user"', fk: "user_id", parentKey: "id", type: "one" },
    class: { table: "class", fk: "class_id", parentKey: "id", type: "one" },
    parent: { table: "parent", fk: "id", parentKey: "parent_id", type: "one" },
  },
  teacher: {
    user: { table: '"user"', fk: "user_id", parentKey: "id", type: "one" },
  },
  parent: {
    user: { table: '"user"', fk: "user_id", parentKey: "id", type: "one" },
    students: { table: "student", fk: "parent_id", parentKey: "id", type: "many" },
  },
  class: {
    teacher: { table: "teacher", fk: "id", parentKey: "teacher_id", type: "one" },
    students: { table: "student", fk: "class_id", parentKey: "id", type: "many" },
  },
  subject: {
    teacher: { table: "teacher", fk: "id", parentKey: "teacher_id", type: "one" },
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
    classGroup: { table: "class_group", fk: "id", parentKey: "class_group_id", type: "one" },
  },
  invoice: {
    student: { table: "student", fk: "id", parentKey: "student_id", type: "one" },
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
    term: { table: "term", fk: "id", parentKey: "term_id", type: "one" },
    session: { table: "session", fk: "id", parentKey: "session_id", type: "one" },
    parent: { table: "parent", fk: "id", parentKey: "parent_id", type: "one" },
    receipt: { table: "receipt", fk: "invoice_id", parentKey: "id", type: "many" },
    items: { table: "invoice_item", fk: "invoice_id", parentKey: "id", type: "many" },
    payments: { table: "payment", fk: "invoice_id", parentKey: "id", type: "many" },
  },
  invoiceItem: {
    feeItem: { table: "fee_item", fk: "id", parentKey: "fee_item_id", type: "one" },
  },
  payment: {
    invoice: { table: "invoice", fk: "id", parentKey: "invoice_id", type: "one" },
    student: { table: "student", fk: "id", parentKey: "student_id", type: "one" },
  },
  feeItem: {
    feeGroup: { table: "fee_group", fk: "id", parentKey: "fee_group_id", type: "one" },
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
    arm: { table: "class_arm", fk: "id", parentKey: "arm_id", type: "one" },
  },
  term: {
    session: { table: "session", fk: "id", parentKey: "session_id", type: "one" },
  },
  score: {
    student: { table: "student", fk: "id", parentKey: "student_id", type: "one" },
    subject: { table: "subject", fk: "id", parentKey: "subject_id", type: "one" },
    term: { table: "term", fk: "id", parentKey: "term_id", type: "one" },
    session: { table: "session", fk: "id", parentKey: "session_id", type: "one" },
  },
  result: {
    student: { table: "student", fk: "id", parentKey: "student_id", type: "one" },
    term: { table: "term", fk: "id", parentKey: "term_id", type: "one" },
    session: { table: "session", fk: "id", parentKey: "session_id", type: "one" },
  },
  lesson: {
    subject: { table: "subject", fk: "id", parentKey: "subject_id", type: "one" },
    teacher: { table: "teacher", fk: "id", parentKey: "teacher_id", type: "one" },
  },
  assignment: {
    subject: { table: "subject", fk: "id", parentKey: "subject_id", type: "one" },
    student: { table: "student", fk: "id", parentKey: "student_id", type: "one" },
  },
  quiz: {
    subject: { table: "subject", fk: "id", parentKey: "subject_id", type: "one" },
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
    teacher: { table: "teacher", fk: "id", parentKey: "teacher_id", type: "one" },
  },
  onlineClass: {
    subject: { table: "subject", fk: "id", parentKey: "subject_id", type: "one" },
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
    teacher: { table: "teacher", fk: "id", parentKey: "teacher_id", type: "one" },
  },
  school: {
    branding: { table: "school_branding", fk: "school_id", parentKey: "id", type: "many" },
    students: { table: "student", fk: "school_id", parentKey: "id", type: "many" },
    teachers: { table: "teacher", fk: "school_id", parentKey: "id", type: "many" },
    payments: { table: "payment", fk: "school_id", parentKey: "id", type: "many" },
    classes: { table: "class", fk: "school_id", parentKey: "id", type: "many" },
    subjects: { table: "subject", fk: "school_id", parentKey: "id", type: "many" },
    sessions: { table: "session", fk: "school_id", parentKey: "id", type: "many" },
    terms: { table: "term", fk: "school_id", parentKey: "id", type: "many" },
  },
  user: {
    role: { table: "role", fk: "id", parentKey: "role_id", type: "one" },
  },
  classArm: {
    class: { table: "class", fk: "id", parentKey: "class_id", type: "one" },
  },
};

async function processInclude<T extends QueryResultRow>(tableName: string, rows: T[], include: Record<string, any> | undefined): Promise<T[]> {
  if (!include || !rows.length) return rows;
  const rels = relationMap[tableName] || {};

  for (const [key, val] of Object.entries(include)) {
    const rel = rels[key];
    if (!rel) {
      console.warn(`[db shim] Unknown include relation: ${tableName}.${key}`);
      continue;
    }

    const parentIds = [...new Set(rows.map((r) => r[rel.parentKey]).filter(Boolean))];
    if (!parentIds.length) continue;

    if (rel.type === "one") {
      const childRows = await queryMany<QueryResultRow>(`SELECT * FROM ${rel.table} WHERE ${rel.fk} = ANY($1)`, [parentIds]);
      const childMap = new Map(childRows.map((c) => [String(c[rel.fk]), c]));
      for (const row of rows) {
        (row as any)[key] = childMap.get(String(row[rel.parentKey])) || null;
      }
    } else {
      const childRows = await queryMany<QueryResultRow>(`SELECT * FROM ${rel.table} WHERE ${rel.fk} = ANY($1)`, [parentIds]);
      const childMap = new Map<string, QueryResultRow[]>();
      for (const c of childRows) {
        const pid = String(c[rel.fk]);
        if (!childMap.has(pid)) childMap.set(pid, []);
        childMap.get(pid)!.push(c);
      }
      for (const row of rows) {
        (row as any)[key] = childMap.get(String(row[rel.parentKey])) || [];
      }
    }

    // Handle nested includes (1 level deep)
    if (val && typeof val === "object" && val.include) {
      const childTable = rel.table.replace(/"/g, "");
      const childRowsFlat: QueryResultRow[] = [];
      for (const row of rows) {
        const children = (row as any)[key];
        if (Array.isArray(children)) childRowsFlat.push(...children);
        else if (children) childRowsFlat.push(children);
      }
      if (childRowsFlat.length) {
        await processInclude(childTable, childRowsFlat, val.include);
      }
    }
  }

  return rows;
}

function cleanData(tableName: string, data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    // Strip nested relation objects (Prisma nested create/connect)
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      if (k === "data" || k === "create" || k === "connect" || k === "disconnect") {
        console.warn(`[db shim] Nested relation key "${k}" on ${tableName} stripped`);
        continue;
      }
      if (v.create !== undefined || v.connect !== undefined || v.disconnect !== undefined) {
        console.warn(`[db shim] Nested relation "${k}" on ${tableName} stripped`);
        continue;
      }
    }
    // user table has no school_id column
    if (tableName === '"user"' && k === "schoolId") {
      continue;
    }
    out[k] = v;
  }
  return out;
}

// Create a model client
function createModelClient(tableName: string) {
  return {
    async findUnique<T extends QueryResultRow = any>({ where, select, include }: { where: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, any> }): Promise<T | null> {
      const { clause, values } = buildWhere(where);
      
      let columns = "*";
      if (select) {
        const selectedCols = Object.keys(select).filter(k => select[k]).map(k => toSnakeCase(k));
        if (selectedCols.length > 0) columns = selectedCols.join(", ");
      }
      
      const row = await queryOne<T>(`SELECT ${columns} FROM ${tableName} ${clause} LIMIT 1`, values);
      if (!row) return null;
      const rows = await processInclude(tableName, [row], include);
      return rows[0] || null;
    },
    
    async findFirst<T extends QueryResultRow = any>({ where, include, orderBy, select }: { where?: Record<string, any>; include?: Record<string, any>; orderBy?: Record<string, string>; select?: Record<string, boolean> } = {}): Promise<T | null> {
      const { clause, values } = buildWhere(where || {});
      
      let columns = "*";
      if (select) {
        const selectedCols = Object.keys(select).filter(k => select[k]).map(k => toSnakeCase(k));
        if (selectedCols.length > 0) columns = selectedCols.join(", ");
      }
      
      let sql = `SELECT ${columns} FROM ${tableName} ${clause}`;
      
      if (orderBy) {
        const [key, direction] = Object.entries(orderBy)[0] || [];
        if (key) {
          sql += ` ORDER BY ${toSnakeCase(key)} ${direction || 'ASC'}`;
        }
      }
      
      const row = await queryOne<T>(`${sql} LIMIT 1`, values);
      if (!row) return null;
      const rows = await processInclude(tableName, [row], include);
      return rows[0] || null;
    },
    
    async findMany<T extends QueryResultRow = any>({ where, orderBy, include, take, select }: { where?: Record<string, any>; orderBy?: Record<string, string> | Array<Record<string, string>>; include?: Record<string, any>; take?: number; select?: Record<string, boolean> } = {}): Promise<T[]> {
      const { clause, values } = buildWhere(where || {});
      
      // Handle select - pick specific columns
      let columns = "*";
      if (select) {
        const selectedCols = Object.keys(select).filter(k => select[k]).map(k => toSnakeCase(k));
        if (selectedCols.length > 0) columns = selectedCols.join(", ");
      }
      
      let sql = `SELECT ${columns} FROM ${tableName} ${clause}`;
      
      if (orderBy) {
        // Handle array style: [{ createdAt: "desc" }]
        const orderObj = Array.isArray(orderBy) ? orderBy[0] : orderBy;
        const [key, direction] = Object.entries(orderObj || {})[0] || [];
        if (key) {
          sql += ` ORDER BY ${toSnakeCase(key)} ${direction || 'ASC'}`;
        }
      }
      
      if (take) {
        sql += ` LIMIT ${take}`;
      }
      
      const rows = await queryMany<T>(sql, values);
      return processInclude(tableName, rows, include);
    },
    
    async create<T extends QueryResultRow = any>({ data, include }: { data: Record<string, any>; include?: Record<string, any> }): Promise<T> {
      const clean = cleanData(tableName, data);
      const entries = Object.entries(clean).filter(([_, v]) => v !== undefined);
      const columns = entries.map(([k]) => toSnakeCase(k));
      const values = entries.map(([_, v]) => v);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      
      const result = await query<T>(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      const rows = await processInclude(tableName, [result.rows[0]], include);
      return rows[0];
    },
    
    async update<T extends QueryResultRow = any>({ where, data, include }: { where: Record<string, any>; data: Record<string, any>; include?: Record<string, any> }): Promise<T> {
      const clean = cleanData(tableName, data);
      const dataEntries = Object.entries(clean).filter(([_, v]) => v !== undefined);
      const setClause = dataEntries.map(([k], i) => `${toSnakeCase(k)} = $${i + 1}`).join(", ");
      const setValues = dataEntries.map(([_, v]) => v);
      
      const { clause: whereClause, values: whereValues } = buildWhere(where);
      const allValues = [...setValues, ...whereValues];
      
      // Adjust placeholders for WHERE clause
      const adjustedWhereClause = whereClause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + setValues.length}`);
      
      const result = await query<T>(
        `UPDATE ${tableName} SET ${setClause} ${adjustedWhereClause} RETURNING *`,
        allValues
      );
      const rows = await processInclude(tableName, [result.rows[0]], include);
      return rows[0];
    },
    
    async updateMany({ where, data }: { where?: Record<string, any>; data: Record<string, any> }): Promise<{ count: number }> {
      const clean = cleanData(tableName, data);
      const dataEntries = Object.entries(clean).filter(([_, v]) => v !== undefined);
      const setClause = dataEntries.map(([k], i) => `${toSnakeCase(k)} = $${i + 1}`).join(", ");
      const setValues = dataEntries.map(([_, v]) => v);
      
      const { clause: whereClause, values: whereValues } = buildWhere(where || {});
      const allValues = [...setValues, ...whereValues];
      
      const adjustedWhereClause = whereClause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + setValues.length}`);
      
      const result = await query(`UPDATE ${tableName} SET ${setClause} ${adjustedWhereClause}`, allValues);
      return { count: result.rowCount || 0 };
    },
    
    async upsert<T extends QueryResultRow = any>({ where, create, update }: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }): Promise<T> {
      const existing = await this.findUnique<T>({ where });
      if (existing) {
        return this.update({ where, data: update });
      }
      return this.create({ data: create });
    },
    
    async delete<T extends QueryResultRow = any>({ where }: { where: Record<string, any> }): Promise<T> {
      const { clause, values } = buildWhere(where);
      const result = await query<T>(`DELETE FROM ${tableName} ${clause} RETURNING *`, values);
      return result.rows[0];
    },
    
    async deleteMany({ where }: { where?: Record<string, any> } = {}): Promise<{ count: number }> {
      const { clause, values } = buildWhere(where || {});
      const result = await query(`DELETE FROM ${tableName} ${clause}`, values);
      return { count: result.rowCount || 0 };
    },
    
    async count({ where }: { where?: Record<string, any> } = {}): Promise<number> {
      const { clause, values } = buildWhere(where || {});
      const result = await query<{ count: string }>(`SELECT COUNT(*) as count FROM ${tableName} ${clause}`, values);
      return parseInt(result.rows[0]?.count || "0");
    },
    
    async aggregate({ where, _sum }: { where?: Record<string, any>; _sum?: Record<string, boolean> }): Promise<{ _sum: Record<string, number | null> }> {
      const { clause, values } = buildWhere(where || {});
      const sumColumns = _sum ? Object.keys(_sum).map(k => `SUM(${toSnakeCase(k)}) as ${toSnakeCase(k)}`) : [];
      
      if (sumColumns.length === 0) {
        return { _sum: {} };
      }
      
      const result = await query<Record<string, string>>(`SELECT ${sumColumns.join(", ")} FROM ${tableName} ${clause}`, values);
      const row = result.rows[0] || {};
      
      const sums: Record<string, number | null> = {};
      for (const key of Object.keys(_sum || {})) {
        const val = row[toSnakeCase(key)];
        sums[key] = val ? parseFloat(val) : null;
      }
      
      return { _sum: sums };
    },
  };
}

// Prisma compatibility export
export const prisma = {
  school: createModelClient("school"),
  schoolBranding: createModelClient("school_branding"),
  role: createModelClient("role"),
  user: createModelClient("user"),
  parent: createModelClient("parent"),
  teacher: createModelClient("teacher"),
  student: createModelClient("student"),
  class: createModelClient("class"),
  classGroup: createModelClient("class_group"),
  classArm: createModelClient("class_arm"),
  subject: createModelClient("subject"),
  session: createModelClient("session"),
  term: createModelClient("term"),
  feeGroup: createModelClient("fee_group"),
  feeComponent: createModelClient("fee_component"),
  feeItem: createModelClient("fee_item"),
  feeProfile: createModelClient("fee_profile"),
  feeProfileItem: createModelClient("fee_profile_item"),
  feeProfileClass: createModelClient("fee_profile_class"),
  feeProfileArm: createModelClient("fee_profile_arm"),
  invoice: createModelClient("invoice"),
  invoiceItem: createModelClient("invoice_item"),
  payment: createModelClient("payment"),
  paymentProof: createModelClient("payment_proof"),
  receipt: createModelClient("receipt"),
  score: createModelClient("score"),
  result: createModelClient("result"),
  attendance: createModelClient("attendance"),
  lesson: createModelClient("lesson"),
  assignment: createModelClient("assignment"),
  quiz: createModelClient("quiz"),
  onlineClass: createModelClient("online_class"),
  announcement: createModelClient("announcement"),
  schoolSetting: createModelClient("school_setting"),
  schoolConfigVersion: createModelClient("school_config_version"),
  parentMessage: createModelClient("parent_message"),
  parentComplaint: createModelClient("parent_complaint"),
  auditLog: createModelClient("audit_log"),
  invoiceContestAudit: createModelClient("invoice_contest_audit"),
  vehicle: createModelClient("vehicle"),
  driver: createModelClient("driver"),
  route: createModelClient("route"),
  routeStop: createModelClient("route_stop"),
  visitor: createModelClient("visitor"),
  enquiry: createModelClient("enquiry"),
  gatePass: createModelClient("gate_pass"),
  receptionComplaint: createModelClient("reception_complaint"),
  callLog: createModelClient("call_log"),
  correspondence: createModelClient("correspondence"),
  query: createModelClient("query"),
  
  // For transactions
  $transaction: withTransaction,
};

// Default export
export default pool;
