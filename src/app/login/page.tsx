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
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function UserLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const online = useOnlineStatus();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await postAuth("/auth/users/login", {
        phone,
        password,
      });

      saveAuthSession(result);
      setMessage({ type: "success", text: "تم تسجيل الدخول بنجاح. جاري التحويل..." });
      router.push("/");
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
      title="تسجيل الدخول"
      subtitle="قم بتسجيل الدخول باستخدام رقم الهاتف وكلمة المرور."
      switchText="ليس لديك حساب؟"
      switchHref="/signup"
      switchLabel="إنشاء حساب"
    >
      {message && <AuthMessage type={message.type} text={message.text} />}

      {!online && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "#1a1a2e",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            fontSize: 12,
            color: "#f59e0b",
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          ⚡ أنت غير متصل بالإنترنت — تسجيل الدخول يتطلب اتصالاً بالإنترنت
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div style={authLabelStyle}>رقم الهاتف</div>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone((event.target as any).value)}
            required
            style={authInputStyle}
            placeholder="01012345678"
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

        <button type="submit" disabled={submitting || !online} style={{ ...authButtonStyle, opacity: submitting || !online ? 0.7 : 1 }}>
          {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>

        <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
          المسار: <strong>/login</strong>
        </p>
      </form>
    </AuthLayout>
  );
}
