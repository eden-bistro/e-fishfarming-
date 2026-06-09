import { createFileRoute } from "@tanstack/react-router";

import { handleIotLatest } from "@/lib/iot-latest";

export const Route = createFileRoute("/api/iot/latest")({
  server: {
    handlers: {
      GET: ({ request }) => handleIotLatest(request, undefined),
      HEAD: ({ request }) => handleIotLatest(request, undefined),
      OPTIONS: ({ request }) => handleIotLatest(request, undefined),
      ANY: ({ request }) => handleIotLatest(request, undefined),
    },
  },
});
