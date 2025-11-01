// @/app/u/signup/page.tsx

"use client";

import { useState } from "react";
import styles from "@/styles/auth.module.css";

/**
 * Signup page for local and OAuth
 */
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        switch (data.error) {
          case "missing_credentials":
            alert("이메일, 비밀번호, 이름을 모두 입력해주세요.");
            break;
          case "local_credential_already_exists":
            alert("이미 가입된 이메일입니다. 로그인 해주세요.");
            break;
          case "user_insert_failed":
            alert("회원가입 처리 중 오류가 발생했습니다.");
            break;
          default:
            alert("알 수 없는 오류가 발생했습니다.");
        }
      }
    } catch {
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.title}>Sign up</h1>
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
        <div className={styles.field}>
          <label htmlFor="passwordConfirm" className={styles.label}>
            Confirm Password
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={`${styles.input} ${passwordConfirm && password !== passwordConfirm ? styles.inputError : ""}`}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
        </div>
        <button type="submit" className={styles.button}>
          Sign up
        </button>
      </form>
    </div>
  );
}
