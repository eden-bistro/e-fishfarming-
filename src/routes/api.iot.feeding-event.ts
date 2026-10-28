import { createFileRoute } from "@tanstack/react-router";

import { handleIotFeedingEvent } from "@/lib/iot-feeding-event";

export const Route = createFileRoute("/api/iot/feeding-event")({
  server: {
    handlers: {
      POST: ({ request }) => handleIotFeedingEvent(request, undefined),
      OPTIONS: ({ request }) => handleIotFeedingEvent(request, undefined),
      ANY: ({ request }) => handleIotFeedingEvent(request, undefined),
    },
  },
});
