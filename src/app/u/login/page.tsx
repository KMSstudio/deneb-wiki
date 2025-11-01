// @/app/u/login/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/styles/auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        switch (data.error) {
          case "missing_credentials":
            alert("이메일과 비밀번호를 모두 입력해주세요.");
            break;
          case "invalid_email_or_password":
            alert("이메일 또는 비밀번호가 올바르지 않습니다.");
            break;
          case "login_failed":
          default:
            alert("로그인 처리 중 오류가 발생했습니다.");
        }
      }
    } catch {
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const googleUrl = (() => {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    return url.toString();
  })();

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.title}>Login</h1>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
        </div>
        <button type="submit" className={styles.button}>
          Sign in
        </button>
      </form>

      <div className={styles.oauth}>
        <Link href="/u/signin" className={styles.textLink}>
          Signup
        </Link>
        {"      |      "}
        <Link href={googleUrl} className={styles.textLink}>
          Sign in with Google
        </Link>
      </div>
    </div>
  );
}
