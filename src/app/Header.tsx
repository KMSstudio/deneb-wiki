// @/components/Header.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/styles/header.module.css";

function HeaderLeft() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleDropdown = () => setIsOpen(o => !o);

  return (
    <div className={styles.left}>
      <Link href="/" className={styles.logo}>
        cse-wiki.com
      </Link>

      <div className={styles.navItemWrap}>
        <button className={styles.navItem}>최근 변경</button>
        <button className={styles.navItem}>최근 토론</button>

        <div className={styles.dropdown}>
          <button
            className={styles.navItem}
            onClick={toggleDropdown}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            특수 기능 ▾
          </button>

          {isOpen && (
            <div className={styles.dropdownMenu}>
              <a href="#">내용이 많은 문서</a>
              <a href="#">작성이 필요한 문서</a>
              <a href="#">Random Page</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderRight() {
  return (
    <div className={styles.right}>
      <button className={styles.randomBtn}>🔀</button>
      <input
        type="text"
        placeholder="여기에서 검색"
        className={styles.search}
      />
      <button className={styles.searchBtn}>🔍</button>
    </div>
  );
}

export default function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <HeaderLeft />
        <HeaderRight />
      </nav>
    </header>
  );
}
