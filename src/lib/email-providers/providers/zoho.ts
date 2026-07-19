import type {
  EmailProvider,
  EmailProviderConfig,
  CreateEmailAccountInput,
  CreateEmailAccountResult,
  DeleteEmailAccountInput,
  SuspendEmailAccountInput,
} from "../index";

export class ZohoMailProvider implements EmailProvider {
  readonly type = "zoho" as const;

  constructor(private config: EmailProviderConfig) {}

  private get authToken(): string {
    return this.config.credentials.zohoAuthToken || this.config.credentials.authToken;
  }

  private get apiUrl(): string {
    const base = this.config.credentials.zohoApiUrl || "https://mail.zoho.com/api/organization";
    return base.replace(/\/$/, "");
  }

  private get orgId(): string {
    return this.config.credentials.zohoOrgId || this.config.credentials.orgId;
  }

  async createAccount(
    input: CreateEmailAccountInput
  ): Promise<CreateEmailAccountResult> {
    const email = `${input.localPart}@${input.domain}`;

    const body = {
      zuid: input.localPart,
      password: input.password,
      displayName: input.displayName || `${input.givenName} ${input.familyName}`.trim(),
      firstName: input.givenName || "",
      lastName: input.familyName || "",
      primaryEmailAddress: email,
      role: "Member",
    };

    const res = await fetch(`${this.apiUrl}/${this.orgId}/accounts`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${this.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Zoho Mail account creation failed: ${data.error?.message || data.message || res.status}`
      );
    }

    return {
      emailAddress: email,
      password: input.password,
      providerUserId: data.data?.zuid,
      raw: data,
    };
  }

  async deleteAccount(input: DeleteEmailAccountInput): Promise<void> {
    const res = await fetch(
      `${this.apiUrl}/${this.orgId}/accounts?primaryEmailAddress=${encodeURIComponent(input.emailAddress)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Zoho-oauthtoken ${this.authToken}`,
        },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Zoho Mail account deletion failed: ${data.error?.message || res.status}`
      );
    }
  }

  async suspendAccount(input: SuspendEmailAccountInput): Promise<void> {
    const res = await fetch(
      `${this.apiUrl}/${this.orgId}/accounts/suspend`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ primaryEmailAddress: input.emailAddress }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Zoho Mail account suspension failed: ${data.error?.message || res.status}`
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(`${this.apiUrl}/${this.orgId}/accounts?limit=1`, {
        headers: { Authorization: `Zoho-oauthtoken ${this.authToken}` },
      });
      if (res.ok) {
        return { ok: true, message: "Zoho Mail connection successful" };
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
