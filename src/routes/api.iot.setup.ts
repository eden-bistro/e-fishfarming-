import { createFileRoute } from "@tanstack/react-router";

import { handleIotSetup } from "@/lib/iot-setup";

export const Route = createFileRoute("/api/iot/setup")({
  server: {
    handlers: {
      POST: ({ request }) => handleIotSetup(request, undefined),
      OPTIONS: ({ request }) => handleIotSetup(request, undefined),
      ANY: ({ request }) => handleIotSetup(request, undefined),
    },
  },
});
