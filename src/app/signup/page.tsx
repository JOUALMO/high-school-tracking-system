"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthLayout,
  AuthMessage,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
} from "@/components/feature/auth/AuthLayout";
import { getApiBaseUrl, postAuth, saveAuthSession } from "@/lib/auth-client";
import { syncSelectedCurriculumToIndexedDb } from "@/lib/curriculum-state";
import { C } from "@/lib/constants";

interface CurriculumOption {
  id: string;
  title: string;
}

export default function UserSignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [curriculaError, setCurriculaError] = useState("");
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurricula() {
      setLoadingCurricula(true);
      setCurriculaError("");

      try {
        const response = await fetch(`${getApiBaseUrl()}/curricula/public`, {
          signal: controller.signal,
        });

        const parsed = (await response.json().catch(() => null)) as {
          items?: CurriculumOption[];
          message?: string;
        } | null;

        if (!response.ok) {
          throw new Error(parsed?.message || "Failed to load curricula.");
        }

        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        setCurricula(
          items.filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.title === "string",
          ),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setCurriculaError(
            error instanceof Error
              ? error.message
              : "Unable to load curricula.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCurricula(false);
        }
      }
    }

    loadCurricula();

    return () => controller.abort();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await postAuth("/auth/users/signup", {
        username,
        phone,
        password,
        confirmPassword,
        curriculumId,
      });

      saveAuthSession(result);
      await syncSelectedCurriculumToIndexedDb().catch(() => null);
      setMessage({ type: "success", text: "Account created. Redirecting..." });
      router.push("/");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Unable to create account.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="User Signup"
      subtitle="Create your account and choose curriculum data."
      switchText="Already registered?"
      switchHref="/login"
      switchLabel="Login"
    >
      {message && <AuthMessage type={message.type} text={message.text} />}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label>
          <div style={authLabelStyle}>Username</div>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            style={authInputStyle}
            placeholder="Your name"
          />
        </label>

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
            minLength={8}
            style={authInputStyle}
            placeholder="8 حروف علي الاقل"
          />
        </label>

        <label>
          <div style={authLabelStyle}>Confirm Password</div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            style={authInputStyle}
            placeholder="تأكيد كلمة السر"
          />
        </label>

        <label>
          <div style={authLabelStyle}>Curriculum</div>
          <select
            value={curriculumId}
            onChange={(event) => setCurriculumId(event.target.value)}
            style={authInputStyle}
            disabled={loadingCurricula || curricula.length === 0}
            required
          >
            <option value="">
              {loadingCurricula ? "Loading curricula..." : "Choose curriculum"}
            </option>
            {curricula.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        {loadingCurricula && (
          <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
            Loading curriculum options...
          </p>
        )}
        {!loadingCurricula && curriculaError && (
          <p style={{ margin: 0, color: C.red, fontSize: 11 }}>
            Curriculum list error: {curriculaError}
          </p>
        )}
        {!loadingCurricula && !curriculaError && curricula.length === 0 && (
          <p style={{ margin: 0, color: C.red, fontSize: 11 }}>
            No published curricula yet. Ask admin to publish at least one
            curriculum.
          </p>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            loadingCurricula ||
            curricula.length === 0 ||
            !curriculumId
          }
          style={{ ...authButtonStyle, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>

        <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
          Route: <strong>/signup</strong>
        </p>
      </form>
    </AuthLayout>
  );
}
