import { createFileRoute } from "@tanstack/react-router";

import { handleIotFeedingCommand } from "@/lib/iot-feeding-command";

export const Route = createFileRoute("/api/iot/feeding-command")({
  server: {
    handlers: {
      GET: ({ request }) => handleIotFeedingCommand(request, undefined),
      HEAD: ({ request }) => handleIotFeedingCommand(request, undefined),
      POST: ({ request }) => handleIotFeedingCommand(request, undefined),
      OPTIONS: ({ request }) => handleIotFeedingCommand(request, undefined),
      ANY: ({ request }) => handleIotFeedingCommand(request, undefined),
    },
  },
});
