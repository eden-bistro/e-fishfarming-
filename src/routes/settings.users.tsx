import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/users")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/users-and-roles" });
  },
});
