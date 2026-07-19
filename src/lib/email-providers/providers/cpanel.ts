import type {
  EmailProvider,
  EmailProviderConfig,
  CreateEmailAccountInput,
  CreateEmailAccountResult,
  DeleteEmailAccountInput,
  SuspendEmailAccountInput,
} from "../index";

export class CPanelProvider implements EmailProvider {
  readonly type = "cpanel" as const;

  constructor(private config: EmailProviderConfig) {}

  private get baseUrl(): string {
    const host = this.config.credentials.cpanelUrl || this.config.credentials.host;
    if (!host) throw new Error("cPanel URL is required");
    return host.replace(/\/$/, "");
  }

  private get apiUrl(): string {
    return `${this.baseUrl}/execute/Email/add_pop`;
  }

  private get deleteUrl(): string {
    return `${this.baseUrl}/execute/Email/delete_pop`;
  }

  private get suspendUrl(): string {
    return `${this.baseUrl}/execute/Email/suspend_pop`;
  }

  private get authHeader(): string {
    const user = this.config.credentials.cpanelUser || this.config.credentials.username;
    const token = this.config.credentials.cpanelToken || this.config.credentials.apiToken;
    if (!user || !token) {
      throw new Error("cPanel username and API token are required");
    }
    return `cpanel ${user}:${token}`;
  }

  async createAccount(
    input: CreateEmailAccountInput
  ): Promise<CreateEmailAccountResult> {
    const params = new URLSearchParams({
      email: input.localPart,
      domain: input.domain,
      password: input.password,
      quota: "0",
    });

    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();

    if (!res.ok || data?.status !== 1) {
      const msg = data?.errors?.[0] || data?.message || `cPanel returned ${res.status}`;
      throw new Error(`cPanel email creation failed: ${msg}`);
    }

    return {
      emailAddress: `${input.localPart}@${input.domain}`,
      password: input.password,
    };
  }

  async deleteAccount(input: DeleteEmailAccountInput): Promise<void> {
    const [localPart, domain] = input.emailAddress.split("@");
    const params = new URLSearchParams({ email: localPart, domain });

    const res = await fetch(this.deleteUrl, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();
    if (!res.ok || data?.status !== 1) {
      const msg = data?.errors?.[0] || `cPanel returned ${res.status}`;
      throw new Error(`cPanel email deletion failed: ${msg}`);
    }
  }

  async suspendAccount(input: SuspendEmailAccountInput): Promise<void> {
    const [localPart, domain] = input.emailAddress.split("@");
    const params = new URLSearchParams({ email: localPart, domain });

    const res = await fetch(this.suspendUrl, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();
    if (!res.ok || data?.status !== 1) {
      const msg = data?.errors?.[0] || `cPanel returned ${res.status}`;
      throw new Error(`cPanel email suspension failed: ${msg}`);
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/execute/Email/list_pops`, {
        headers: { Authorization: this.authHeader },
      });
      if (res.ok) {
        return { ok: true, message: "cPanel connection successful" };
      }
      return { ok: false, message: `cPanel returned ${res.status}` };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }
}
