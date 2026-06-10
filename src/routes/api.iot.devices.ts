import { createFileRoute } from "@tanstack/react-router";

import { handleIotDevices } from "@/lib/iot-devices";

export const Route = createFileRoute("/api/iot/devices")({
  server: {
    handlers: {
      GET: ({ request }) => handleIotDevices(request, undefined),
      HEAD: ({ request }) => handleIotDevices(request, undefined),
      OPTIONS: ({ request }) => handleIotDevices(request, undefined),
      ANY: ({ request }) => handleIotDevices(request, undefined),
    },
  },
});
