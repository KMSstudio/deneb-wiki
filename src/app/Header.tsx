// @/components/Header.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "@/styles/header.module.css";

function HeaderLeft() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleDropdown = () => setIsOpen((o) => !o);

  return (
    <div className={styles.left}>
      <Link href="/" className={styles.logo}>
        <Image src="/logo/light.png" alt="cse-wiki.com" width={96} height={48} className={styles.logoImgDefault} />
        <Image src="/logo/light_underlined.png" alt="" aria-hidden="true" width={96} height={48} className={styles.logoImgHover} />
      </Link>

      <div className={styles.navItemWrap}>
        <button className={styles.navItem}>최근 변경</button>
        <button className={styles.navItem}>최근 토론</button>

        <div className={styles.dropdown}>
          <button className={styles.navItem} onClick={toggleDropdown} aria-expanded={isOpen} aria-haspopup="true">
            특수 기능 ▾
          </button>

          {isOpen && (
            <div className={styles.dropdownMenu}>
              <Link href="#">내용이 많은 문서</Link>
              <Link href="/g/list/article">작성된 모든 문서</Link>
              <Link href="/g/need/article">작성이 필요한 문서</Link>
              <Link href="/g/random">Random Page</Link>
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
      <input type="text" placeholder="여기에서 검색" className={styles.search} />
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
