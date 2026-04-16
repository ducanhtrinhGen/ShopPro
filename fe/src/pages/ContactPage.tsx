import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createContactMessage } from "../api/contact";
import { ApiRequestError } from "../api/client";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

type FormState = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

const DEFAULT_FORM: FormState = {
  fullName: "",
  email: "",
  subject: "",
  message: ""
};

export function ContactPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.fullName.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Vui lòng nhập đủ thông tin.");
      return;
    }

    setIsSending(true);
    try {
      await createContactMessage({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim()
      });
      setMessage("Đã gửi liên hệ. ShopPro sẽ phản hồi sớm.");
      setForm(DEFAULT_FORM);
    } catch (e) {
      setError(toErrorMessage(e, "Không gửi được liên hệ."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <h1>Liên hệ ShopPro</h1>
        <p>Gửi yêu cầu tư vấn build PC, báo lỗi đơn hàng, hoặc góp ý sản phẩm.</p>
        <div className="page-header-actions">
          <Link to="/products">Mở catalog</Link>
          <Link to="/blog">Blog</Link>
        </div>
      </header>

      {message ? <p className="inline-notice">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="form">
        <label>
          Họ và tên
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
        </label>
        <label>
          Email
          <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label>
          Chủ đề
          <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
        </label>
        <label>
          Nội dung
          <textarea
            rows={6}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          />
        </label>
        <button type="submit" disabled={isSending}>
          {isSending ? "Đang gửi..." : "Gửi liên hệ"}
        </button>
      </form>
    </section>
  );
}

