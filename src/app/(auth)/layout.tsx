export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-auth-shell
      className="h-dvh max-h-dvh overflow-hidden bg-bg supports-[height:100dvh]:h-[100dvh]"
    >
      {children}
    </div>
  );
}
