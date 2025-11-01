// @/components/Forbidden.tsx

import Link from "next/link";
import styles from "./forbidden.module.css";

type Props = { sid?: string; reason?: string; detail?: unknown };

export default function Forbidden({ sid, reason, detail }: Props) {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>403 · Forbidden</h1>
      <p className={styles.alert}>열람 권한이 없습니다.</p>
      {sid ? <code className={styles.sid}>{sid}</code> : null}
      {reason ? <p className={styles.reason}>사유: {reason}</p> : null}
      {detail ? (
        <details className={styles.details}>
          <summary>자세히</summary>
          <pre className={styles.pre}>{JSON.stringify(detail, null, 2)}</pre>
        </details>
      ) : null}
      <Link href="/" className={styles.home}>
        Home
      </Link>
    </main>
  );
}
