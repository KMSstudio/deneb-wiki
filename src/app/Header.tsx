// @/components/Header.tsx

"use client";

import styles from "@/styles/header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <div className={styles.left}>
          <span className={styles.logo}>cse-wiki.com</span>

          <button className={styles.navItem}>최근 변경</button>
          <button className={styles.navItem}>최근 토론</button>
          <div className={styles.dropdown}>
            <button className={styles.navItem}>특수 기능 ▾</button>
            <div className={styles.dropdownMenu}>
              <a href="#">통계</a>
              <a href="#">도움말</a>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <button className={styles.randomBtn}>🔀</button>
          <input
            type="text"
            placeholder="여기에서 검색"
            className={styles.search}
          />
          <button className={styles.searchBtn}>🔍</button>
        </div>
      </nav>
    </header>
  );
}
