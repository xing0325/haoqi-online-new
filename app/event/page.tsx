import { Suspense } from "react";
import EventDetail from "@/components/calendar/EventDetail";

export default function EventPage() {
  return (
    <Suspense fallback={null}>
      <EventDetail />
    </Suspense>
  );
}
