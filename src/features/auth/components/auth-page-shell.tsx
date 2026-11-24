import { AuthBrandPanel } from "./auth-brand-panel";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <AuthBrandPanel />
      {children}
    </div>
  );
}