// @/app/u/me/page.tsx

import { cookies } from "next/headers";
import Link from "next/link";
import { verifyJwt } from "@/lib/user";
import styles from "@/styles/auth.module.css";

export default async function MePage() {
  const token = (await cookies()).get("session")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>내 정보</h1>
        <p>로그인되어 있지 않습니다.</p>
        <div className={styles.oauth}>
          <Link href="/" className={styles.textLink}>
            Back to main
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>내 정보</h1>
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.label}>UID</span>
          <span>{payload.uid}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Email</span>
          <span>{payload.email}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Name</span>
          <span>{payload.name ?? "(이름 없음)"}</span>
        </div>
      </div>

      <div className={styles.oauth}>
        <Link href="/" className={styles.textLink}>
          Back to main
        </Link>
        {"      |      "}
        <Link href="/api/auth/logout" className={styles.textLink}>
          Logout
        </Link>
      </div>
    </div>
  );
}
