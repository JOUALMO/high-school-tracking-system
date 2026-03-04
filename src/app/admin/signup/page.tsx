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

export default function AdminSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await postAuth("/auth/admin/signup", {
        name,
        email,
        password,
        confirmPassword,
        accessPassword,
      });

      saveAuthSession(result);
      setMessage({
        type: "success",
        text: "تم إنشاء حساب المسؤول. جاري التحويل...",
      });
      router.push("/admin/dashboard");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر إنشاء الحساب.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="إنشاء حساب مسؤول"
      subtitle="قم بإنشاء حساب مسؤول باستخدام كلمة مرور الوصول المحمية."
      switchText="هل لديك حساب مسؤول بالفعل؟"
      switchHref="/admin/login"
      switchLabel="تسجيل الدخول"
    >
      {message && <AuthMessage type={message.type} text={message.text} />}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label>
          <div style={authLabelStyle}>الاسم</div>
          <input
            type="text"
            value={name}
            onChange={(event) => setName((event.target as any).value)}
            required
            style={authInputStyle}
            placeholder="اسم المسؤول"
          />
        </label>

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
            minLength={8}
            style={authInputStyle}
            placeholder="8 حروف علي الاقل"
          />
        </label>

        <label>
          <div style={authLabelStyle}>تأكيد كلمة المرور</div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword((event.target as any).value)}
            required
            minLength={8}
            style={authInputStyle}
            placeholder="تأكيد كلمة السر"
          />
        </label>

        <label>
          <div style={authLabelStyle}>كلمة مرور الوصول</div>
          <input
            type="password"
            value={accessPassword}
            onChange={(event) => setAccessPassword((event.target as any).value)}
            required
            style={authInputStyle}
            placeholder="احضرها من ADMIN_SIGNUP_ACCESS_PASSWORD"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ ...authButtonStyle, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "جاري إنشاء الحساب..." : "إنشاء حساب مسؤول"}
        </button>

        <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
          Route: <strong>/admin/signup</strong>
        </p>
      </form>
    </AuthLayout>
  );
}
