import type {
  EmailProvider,
  EmailProviderConfig,
  CreateEmailAccountInput,
  CreateEmailAccountResult,
  DeleteEmailAccountInput,
  SuspendEmailAccountInput,
} from "../index";

export class GoogleWorkspaceProvider implements EmailProvider {
  readonly type = "google" as const;

  constructor(private config: EmailProviderConfig) {}

  private get serviceAccountEmail(): string {
    return this.config.credentials.serviceAccountEmail;
  }

  private get privateKey(): string {
    return this.config.credentials.privateKey?.replace(/\\n/g, "\n");
  }

  private get adminEmail(): string {
    return this.config.credentials.adminEmail;
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: this.serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/admin.directory.user",
      aud: "https://oauth2.googleapis.com/token",
      sub: this.adminEmail,
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      "pkcs8",
      this.pemToArrayBuffer(this.privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signInput)
    );

    const encodedSignature = Buffer.from(signature).toString("base64url");
    const jwt = `${signInput}.${encodedSignature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Google auth failed: ${data.error_description || data.error}`);
    }
    return data.access_token;
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    return Buffer.from(b64, "base64").buffer;
  }

  async createAccount(
    input: CreateEmailAccountInput
  ): Promise<CreateEmailAccountResult> {
    const token = await this.getAccessToken();
    const primaryEmail = `${input.localPart}@${input.domain}`;

    const body = {
      primaryEmail,
      name: {
        givenName: input.givenName || input.localPart,
        familyName: input.familyName || "",
        fullName: input.displayName || `${input.givenName} ${input.familyName}`.trim(),
      },
      password: input.password,
      changePasswordAtNextLogin: true,
    };

    const res = await fetch(
      "https://admin.googleapis.com/admin/directory/v1/users",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Google Workspace user creation failed: ${data.error?.message || res.status}`
      );
    }

    return {
      emailAddress: primaryEmail,
      password: input.password,
      providerUserId: data.id,
      raw: data,
    };
  }

  async deleteAccount(input: DeleteEmailAccountInput): Promise<void> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${input.emailAddress}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Google Workspace user deletion failed: ${data.error?.message || res.status}`
      );
    }
  }

  async suspendAccount(input: SuspendEmailAccountInput): Promise<void> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${input.emailAddress}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ suspended: true }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Google Workspace user suspension failed: ${data.error?.message || res.status}`
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        "https://admin.googleapis.com/admin/directory/v1/users?maxResults=1",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        return { ok: true, message: "Google Workspace connection successful" };
      }
      const data = await res.json();
      return { ok: false, message: data.error?.message || `HTTP ${res.status}` };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }
}
