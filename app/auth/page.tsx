import { Suspense } from "react";

import { AuthView } from "@/components/mobile/auth-view";

export default function AuthPage() {
  return <Suspense fallback={null}><AuthView /></Suspense>;
}
