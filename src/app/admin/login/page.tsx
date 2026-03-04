"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthLayout,
  AuthMessage,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
} from "@/components/feature/auth/AuthLayout";
import { postAuth, saveAuthSession } from "@/lib/auth-client";
import { C } from "@/lib/constants";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await postAuth("/auth/admin/login", {
        email,
        password,
      });

      saveAuthSession(result);
      setMessage({ type: "success", text: "تم تسجيل الدخول بنجاح. جاري التحويل للوحة التحكم..." });
      router.push("/admin/dashboard");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر تسجيل الدخول.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="تسجيل دخول المسؤول"
      subtitle="قم بتسجيل الدخول لإدارة المناهج وإعدادات المنصة."
      switchText="ليس لديك حساب مسؤول بعد؟"
      switchHref="/admin/signup"
      switchLabel="إنشاء حساب"
    >
      {message && <AuthMessage type={message.type} text={message.text} />}

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div style={authLabelStyle}>البريد الإلكتروني</div>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail((event.target as any).value)}
            required
            style={authInputStyle}
            placeholder="admin@example.com"
          />
        </label>

        <label>
          <div style={authLabelStyle}>كلمة المرور</div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword((event.target as any).value)}
            required
            style={authInputStyle}
            placeholder="كلمة المرور الخاصة بك"
          />
        </label>

        <button type="submit" disabled={submitting} style={{ ...authButtonStyle, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>

        <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
          Route: <strong>/admin/login</strong>
        </p>
      </form>
    </AuthLayout>
  );
}
