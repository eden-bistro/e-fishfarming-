import {
  encodedFarmPondPath,
  firebaseDatabaseHeaders,
  firebaseDatabaseUrl,
  getEnvRecord,
  jsonResponse,
  noContentResponse,
  readFirebaseJson,
  resolveFirebaseDatabase,
  writeFirebaseJson,
} from "@/lib/iot-firebase";

type RegisteredDevice = {
  token: string;
  farmId: string;
  pondId: string;
  enabled?: boolean;
};

function safeTokenEquals(candidate: string, expected: string): boolean {
  if (!candidate || !expected || candidate.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    difference |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

function resolveRegisteredDevice(
  env: unknown,
  deviceId: string,
  token: string,
): { ok: true; device: RegisteredDevice } | { ok: false; response: Response } {
  const raw = getEnvRecord(env).IOT_DEVICE_REGISTRY_JSON?.trim();
  if (!raw) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, message: "Device registry is not configured." },
        503,
        { "cache-control": "no-store" },
      ),
    };
  }

  let registry: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("invalid registry");
    }
    registry = parsed as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, message: "Device registry is invalid." },
        500,
        { "cache-control": "no-store" },
      ),
    };
  }

  const rawDevice = registry[deviceId];
  if (!rawDevice || Array.isArray(rawDevice) || typeof rawDevice !== "object") {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, message: "Device is not registered." },
        403,
        { "cache-control": "no-store" },
      ),
    };
  }

  const device = rawDevice as Record<string, unknown>;
  if (
    typeof device.token !== "string" ||
    device.token.length < 24 ||
    typeof device.farmId !== "string" ||
    typeof device.pondId !== "string" ||
    device.enabled === false ||
    (device.enabled !== undefined && typeof device.enabled !== "boolean") ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(device.farmId) ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(device.pondId) ||
    !safeTokenEquals(token, device.token)
  ) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, message: "Device is not authorized." },
        403,
        { "cache-control": "no-store" },
      ),
    };
  }

  return {
    ok: true,
    device: {
      token: device.token,
      farmId: device.farmId,
      pondId: device.pondId,
      enabled: device.enabled !== false,
    },
  };
}

function requestToken(request: Request): string {
  return (
    request.headers
      .get("authorization")
      ?.match(/^Bearer\\s+(.+)$/i)?.[1]
      ?.trim() ?? ""
  );
}

export async function handleIotDeviceCommands(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "GET, POST, OPTIONS",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed for device commands." }, 405, {
      allow: "GET, POST, OPTIONS",
      "cache-control": "no-store",
    });
  }

  const url = new URL(request.url);
  const deviceId = (url.searchParams.get("deviceId") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(deviceId)) {
    return jsonResponse(
      { ok: false, message: "A valid deviceId is required." },
      400,
      { "cache-control": "no-store" },
    );
  }

  const registered = resolveRegisteredDevice(env, deviceId, requestToken(request));
  if (!registered.ok) return registered.response;

  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) return firebase.response;

  const commandsPath = `${encodedFarmPondPath(
    registered.device.farmId,
    registered.device.pondId,
  )}/feeding/commands`;

  if (request.method === "GET") {
    const readUrl = new URL(firebaseDatabaseUrl(firebase.baseUrl, commandsPath, firebase.auth));
    readUrl.searchParams.set("orderBy", '"$key"');
    readUrl.searchParams.set("limitToLast", "50");
    const response = await fetch(readUrl, {
      headers: firebaseDatabaseHeaders(firebase.auth),
      cache: "no-store",
    });
    if (!response.ok) {
      return jsonResponse(
        { ok: false, message: "Failed to read device commands." },
        502,
        { "cache-control": "no-store" },
      );
    }

    const raw = (await response.json().catch(() => null)) as
      | Record<string, Record<string, unknown>>
      | null;
    const commands =
      raw && typeof raw === "object"
        ? Object.entries(raw)
            .filter(([, command]) => command && command.status === "queued")
            .map(([id, command]) => ({ ...command, id }))
        : [];
    return jsonResponse({ ok: true, deviceId, commands }, 200, {
      "cache-control": "no-store",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400, {
      "cache-control": "no-store",
    });
  }

  const commandId = typeof body.commandId === "string" ? body.commandId.trim() : "";
  const status = body.status;
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(commandId) ||
    !["ack", "done", "failed"].includes(String(status))
  ) {
    return jsonResponse(
      { ok: false, message: "commandId and status (ack, done, failed) are required." },
      400,
      { "cache-control": "no-store" },
    );
  }

  const commandPath = `${commandsPath}/${encodeURIComponent(commandId)}`;
  const existingResponse = await readFirebaseJson(firebase.baseUrl, commandPath, firebase.auth);
  if (!existingResponse.ok) {
    return jsonResponse({ ok: false, message: "Failed to verify command." }, 502, {
      "cache-control": "no-store",
    });
  }

  const existing = (await existingResponse.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!existing) {
    return jsonResponse({ ok: false, message: "Command not found." }, 404, {
      "cache-control": "no-store",
    });
  }

  const allowedTransition =
    (status === "ack" && existing.status === "queued") ||
    ((status === "done" || status === "failed") && existing.status === "ack");
  if (!allowedTransition) {
    return jsonResponse({ ok: false, message: "Invalid command status transition." }, 409, {
      "cache-control": "no-store",
    });
  }

  const patch: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (typeof body.error === "string" && status === "failed") {
    patch.error = body.error.slice(0, 300);
  }

  const response = await writeFirebaseJson(
    firebase.baseUrl,
    commandPath,
    firebase.auth,
    patch,
    "PATCH",
  );
  if (!response.ok) {
    return jsonResponse({ ok: false, message: "Failed to update command status." }, 502, {
      "cache-control": "no-store",
    });
  }

  return jsonResponse({ ok: true, commandId, status }, 200, {
    "cache-control": "no-store",
  });
}
