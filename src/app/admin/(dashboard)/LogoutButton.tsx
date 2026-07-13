"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
    >
      Sair
    </button>
  );
}
