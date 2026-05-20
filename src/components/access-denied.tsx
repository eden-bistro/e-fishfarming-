import { Link } from "@tanstack/react-router";

export function AccessDenied({ message = "You don't have permission to access this module." }: { message?: string }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <h2 className="text-xl font-semibold">Access denied</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-4">
        <Link to="/" className="rounded-md border px-4 py-2 text-sm">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
