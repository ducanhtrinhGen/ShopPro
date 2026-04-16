import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getBlogPost } from "../api/blog";
import { ApiRequestError } from "../api/client";
import type { BlogPostDetail } from "../types";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export function BlogPostPage() {
  const { slug } = useParams();
  const normalized = (slug ?? "").trim();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalized) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const data = await getBlogPost(normalized);
        if (!active) return;
        setPost(data);
      } catch (e) {
        if (!active) return;
        setPost(null);
        setError(toErrorMessage(e, "Không tải được bài viết."));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [normalized]);

  if (!normalized) {
    return <Navigate to="/blog" replace />;
  }

  if (isLoading) {
    return (
      <section className="panel">
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải bài viết...</p>
        </div>
      </section>
    );
  }

  if (!post || error) {
    return (
      <section className="panel">
        <header className="page-header">
          <h1>Không tìm thấy bài viết</h1>
          <p>{error ?? "Bài viết không tồn tại."}</p>
          <Link to="/blog">← Quay lại blog</Link>
        </header>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="page-header">
        <p className="breadcrumbs">
          <Link to="/blog">Blog</Link>
        </p>
        <h1>{post.title}</h1>
        <p style={{ opacity: 0.8 }}>{dateFormatter.format(new Date(post.createdAt))}</p>
        <div className="page-header-actions">
          <Link to="/products">Mở catalog</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
      </header>

      {post.summary ? <p style={{ opacity: 0.9 }}>{post.summary}</p> : null}
      <article style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{post.content}</article>
    </section>
  );
}

