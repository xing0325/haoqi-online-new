import { Suspense } from "react";
import CourseHome from "@/components/courses/CourseHome";

export default function CoursePage() {
  return (
    <Suspense fallback={null}>
      <CourseHome />
    </Suspense>
  );
}
