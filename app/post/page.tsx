import { Suspense } from "react";
import PostDetail from "@/components/courses/PostDetail";

export default function PostPage() {
  return (
    <Suspense fallback={null}>
      <PostDetail />
    </Suspense>
  );
}
