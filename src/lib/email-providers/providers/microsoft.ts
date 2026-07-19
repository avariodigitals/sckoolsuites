import type {
  EmailProvider,
  EmailProviderConfig,
  CreateEmailAccountInput,
  CreateEmailAccountResult,
  DeleteEmailAccountInput,
  SuspendEmailAccountInput,
} from "../index";

export class Microsoft365Provider implements EmailProvider {
  readonly type = "microsoft" as const;

  constructor(private config: EmailProviderConfig) {}

  private get tenantId(): string {
    return this.config.credentials.tenantId;
  }

  private get clientId(): string {
    return this.config.credentials.clientId;
  }

  private get clientSecret(): string {
    return this.config.credentials.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Microsoft auth failed: ${data.error_description || data.error}`);
    }
    return data.access_token;
  }

  async createAccount(
    input: CreateEmailAccountInput
  ): Promise<CreateEmailAccountResult> {
    const token = await this.getAccessToken();
    const upn = `${input.localPart}@${input.domain}`;
    const mailNickname = input.localPart;

    const body = {
      accountEnabled: true,
      displayName: input.displayName || `${input.givenName} ${input.familyName}`.trim(),
      givenName: input.givenName || "",
      surname: input.familyName || "",
      mailNickname,
      userPrincipalName: upn,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: input.password,
      },
      usageLocation: this.config.credentials.usageLocation || "US",
    };

    const res = await fetch("https://graph.microsoft.com/v1.0/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Microsoft 365 user creation failed: ${data.error?.message || res.status}`
      );
    }

    return {
      emailAddress: upn,
      password: input.password,
      providerUserId: data.id,
      raw: data,
    };
  }

  async deleteAccount(input: DeleteEmailAccountInput): Promise<void> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${input.emailAddress}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Microsoft 365 user deletion failed: ${data.error?.message || res.status}`
      );
    }
  }

  async suspendAccount(input: SuspendEmailAccountInput): Promise<void> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${input.emailAddress}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountEnabled: false }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(
        `Microsoft 365 user suspension failed: ${data.error?.message || res.status}`
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch("https://graph.microsoft.com/v1.0/users?$top=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { ok: true, message: "Microsoft 365 connection successful" };
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
