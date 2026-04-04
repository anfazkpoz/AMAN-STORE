"use client";

import { AccountingProvider } from "@/lib/AccountingContext";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountingProvider>
      {children}
    </AccountingProvider>
  );
}
