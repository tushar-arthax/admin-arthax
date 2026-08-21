import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[140px]" />

      <div className="panel relative z-10 w-full max-w-md p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-surface-2/60">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <p className="text-5xl font-extrabold tracking-tight text-foreground">404</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing lives at <span className="font-mono text-foreground/80">{location.pathname}</span>.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
