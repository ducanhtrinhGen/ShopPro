import { apiRequest } from "./client";
import type { BlogPostDetail, BlogPostSummary } from "../types";

export function listBlogPosts() {
  return apiRequest<BlogPostSummary[]>("/api/blog-posts");
}

export function getBlogPost(slug: string) {
  return apiRequest<BlogPostDetail>(`/api/blog-posts/${encodeURIComponent(slug)}`);
}

