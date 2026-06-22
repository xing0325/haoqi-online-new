import { Suspense } from "react";
import Composer from "@/components/courses/Composer";

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <Composer />
    </Suspense>
  );
}
