export type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export type FirebaseDatabaseAuth =
  | { type: "database-secret"; token: string }
  | { type: "oauth"; token: string }
  | { type: "none" };

export type FirebaseDatabaseConfig = {
  baseUrl?: string;
  serviceAccountJson?: string;
  databaseSecret?: string;
};

export function getEnvRecord(env: unknown): Record<string, string | undefined> {
  const runtime =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  if (!env || typeof env !== "object") return runtime;
  return { ...runtime, ...(env as Record<string, string | undefined>) };
}

export function firstDefined(values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

export function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function noContentResponse(status = 204, extraHeaders?: HeadersInit): Response {
  return new Response(null, { status, headers: extraHeaders });
}

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let account: ServiceAccount;
  try {
    account = JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON.");
  }

  if (!account.client_email || !account.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must include client_email and private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: account.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsignedJwt = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claimSet))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );
  const jwt = `${unsignedJwt}.${b64url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || `Google token request failed: ${response.status}`);
  }
  return payload.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.replace(/\\n/g, "\n");
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function getFirebaseDatabaseConfig(env: unknown): FirebaseDatabaseConfig {
  const envRecord = getEnvRecord(env);
  return {
    baseUrl: firstDefined([
      envRecord.VITE_FIREBASE_DATABASE_URL,
      envRecord.FIREBASE_DATABASE_URL,
      envRecord.FIREBASE_URL,
    ])?.replace(/\/+$/, ""),
    serviceAccountJson: envRecord.FIREBASE_SERVICE_ACCOUNT,
    databaseSecret: firstDefined([
      envRecord.FIREBASE_DATABASE_SECRET,
      envRecord.FIREBASE_AUTH_TOKEN,
    ]),
  };
}

export function getDefaultPondId(env: unknown): string {
  return firstDefined([getEnvRecord(env).VITE_DEFAULT_POND_ID]) ?? "cage_001";
}

export async function getFirebaseDatabaseAuth(
  config: FirebaseDatabaseConfig,
): Promise<FirebaseDatabaseAuth> {
  if (config.databaseSecret) {
    return { type: "database-secret", token: config.databaseSecret };
  }
  if (config.serviceAccountJson) {
    return { type: "oauth", token: await getGoogleAccessToken(config.serviceAccountJson) };
  }
  return { type: "none" };
}

export function firebaseDatabaseUrl(
  baseUrl: string,
  path: string,
  auth: FirebaseDatabaseAuth,
): string {
  const url = `${baseUrl}/${path}.json`;
  if (auth.type !== "database-secret") return url;
  return `${url}?auth=${encodeURIComponent(auth.token)}`;
}

export function firebaseDatabaseHeaders(auth: FirebaseDatabaseAuth): Record<string, string> {
  if (auth.type === "oauth") return { authorization: `Bearer ${auth.token}` };
  return {};
}

export async function resolveFirebaseDatabase(
  env: unknown,
): Promise<
  { ok: true; baseUrl: string; auth: FirebaseDatabaseAuth } | { ok: false; response: Response }
> {
  const config = getFirebaseDatabaseConfig(env);
  if (!config.baseUrl) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          message:
            "Firebase URL is not configured. Set VITE_FIREBASE_DATABASE_URL or FIREBASE_DATABASE_URL (FIREBASE_URL alias supported).",
        },
        500,
        { "cache-control": "no-store" },
      ),
    };
  }

  try {
    const auth = await getFirebaseDatabaseAuth(config);
    if (auth.type === "none") {
      return {
        ok: false,
        response: jsonResponse(
          {
            ok: false,
            message:
              "Firebase database authentication is not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_DATABASE_SECRET/FIREBASE_AUTH_TOKEN.",
          },
          500,
          { "cache-control": "no-store" },
        ),
      };
    }
    return { ok: true, baseUrl: config.baseUrl, auth };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          message: "Firebase service account authentication failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
        { "cache-control": "no-store" },
      ),
    };
  }
}

export async function readFirebaseJson(
  baseUrl: string,
  path: string,
  auth: FirebaseDatabaseAuth,
): Promise<Response> {
  return fetch(firebaseDatabaseUrl(baseUrl, path, auth), {
    method: "GET",
    headers: firebaseDatabaseHeaders(auth),
  });
}

export async function writeFirebaseJson(
  baseUrl: string,
  path: string,
  auth: FirebaseDatabaseAuth,
  payload: unknown,
  method: "PUT" | "PATCH" | "POST" = "PUT",
): Promise<Response> {
  return fetch(firebaseDatabaseUrl(baseUrl, path, auth), {
    method,
    headers: {
      "content-type": "application/json",
      ...firebaseDatabaseHeaders(auth),
    },
    body: JSON.stringify(payload),
  });
}

export function encodedFarmPondPath(farmId: string, pondId: string): string {
  return `farms/${encodeURIComponent(farmId)}/ponds/${encodeURIComponent(pondId)}`;
}
