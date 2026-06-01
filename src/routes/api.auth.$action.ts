import { createFileRoute } from "@tanstack/react-router";
import { handleSupabaseAuthProxy } from "@/lib/supabase-auth-proxy";

function getAction(params: unknown) {
  return String((params as { action?: string }).action ?? "");
}

export const Route = createFileRoute("/api/auth/$action")({
  server: {
    handlers: {
      POST: ({ request, params }) => handleSupabaseAuthProxy(request, undefined, getAction(params)),
      ANY: ({ request, params }) => handleSupabaseAuthProxy(request, undefined, getAction(params)),
    },
  },
});
