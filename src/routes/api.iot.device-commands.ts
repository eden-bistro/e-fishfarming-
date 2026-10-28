import { createFileRoute } from "@tanstack/react-router";

import { handleIotDeviceCommands } from "@/lib/iot-device-commands";

export const Route = createFileRoute("/api/iot/device-commands")({
  server: {
    handlers: {
      GET: ({ request }) => handleIotDeviceCommands(request, undefined),
      POST: ({ request }) => handleIotDeviceCommands(request, undefined),
      OPTIONS: ({ request }) => handleIotDeviceCommands(request, undefined),
      ANY: ({ request }) => handleIotDeviceCommands(request, undefined),
    },
  },
});
