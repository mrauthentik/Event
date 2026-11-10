"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-red-400 hover:underline text-[10px] cursor-pointer"
    >
      Logout
    </button>
  );
}
