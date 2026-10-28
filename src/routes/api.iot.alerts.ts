import { createFileRoute } from "@tanstack/react-router";

import { handleIotAlerts } from "@/lib/iot-alerts";

export const Route = createFileRoute("/api/iot/alerts")({
  server: {
    handlers: {
      GET: ({ request }) => handleIotAlerts(request, undefined),
      HEAD: ({ request }) => handleIotAlerts(request, undefined),
      OPTIONS: ({ request }) => handleIotAlerts(request, undefined),
      ANY: ({ request }) => handleIotAlerts(request, undefined),
    },
  },
});
