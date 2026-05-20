import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cages/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Cage Management</h1>
      <p className="text-sm text-muted-foreground">
        Phase 2 foundation: enterprise module shell is ready. Next step is wiring CRUD screens, analytics widgets,
        and role-based access controls.
      </p>
    </div>
  );
}
