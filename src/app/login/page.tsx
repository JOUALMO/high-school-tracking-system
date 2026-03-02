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
      setMessage({ type: "success", text: "Login successful. Redirecting..." });
      router.push("/");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to login.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="User Login"
      subtitle="Sign in with phone number and password."
      switchText="Need an account?"
      switchHref="/signup"
      switchLabel="Create one"
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
          ⚡ You&apos;re offline — login requires an internet connection
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div style={authLabelStyle}>Phone Number</div>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            style={authInputStyle}
            placeholder="01012345678"
          />
        </label>

        <label>
          <div style={authLabelStyle}>Password</div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={authInputStyle}
            placeholder="Your password"
          />
        </label>

        <button type="submit" disabled={submitting || !online} style={{ ...authButtonStyle, opacity: submitting || !online ? 0.7 : 1 }}>
          {submitting ? "Signing in..." : "Login"}
        </button>

        <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
          Route: <strong>/login</strong>
        </p>
      </form>
    </AuthLayout>
  );
}
