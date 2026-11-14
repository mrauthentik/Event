"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, MoveLeft } from "lucide-react";
import gsap from "gsap";
import { SITE_CONFIG } from "@/config/site";
import styles from "./not-found.module.css";

export default function NotFound() {
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .fromTo(".not-found-brand", { opacity: 0, y: -16, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7 })
        .fromTo(".not-found-digit", { opacity: 0, y: 46, rotateX: -16, scale: 0.9 }, { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.9, stagger: 0.12 }, "-=0.28")
        .fromTo(".not-found-message", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.3")
        .fromTo(".not-found-action", { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1 }, "-=0.3")
        .fromTo(".not-found-wire", { strokeDashoffset: 1200 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, "-=0.25")
        .fromTo(".not-found-spark", { opacity: 0, scale: 0.2, rotate: -45 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.45, stagger: 0.08 }, "-=0.65");

      gsap.to(".not-found-emblem", {
        y: -7,
        rotate: 2,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.1,
      });
    }, page);

    return () => context.revert();
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <div className={`${styles.blob} ${styles.blobLeft}`} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobRight}`} aria-hidden="true" />

      <svg className={styles.wire} viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
        <path className="not-found-wire" d="M-20 102 C 148 96, 182 22, 328 70 S 504 178, 642 119" />
        <path className="not-found-wire" d="M798 119 C 930 68, 1013 85, 1114 128 S 1300 177, 1460 112" />
        <path className={styles.wireAccent} d="M690 116 L710 127 L730 116 M710 127 L710 151" />
        <circle className={styles.wireNode} cx="642" cy="119" r="7" />
        <circle className={styles.wireNode} cx="798" cy="119" r="7" />
        <path className={`${styles.spark} not-found-spark`} d="M656 95 l-7 15 11-3-4 14 13-18-11 3 5-11z" />
        <path className={`${styles.spark} not-found-spark`} d="M785 95 l-7 15 11-3-4 14 13-18-11 3 5-11z" />
      </svg>

      <section className={styles.content} aria-labelledby="not-found-title">
        <Link href="/" className={`${styles.brand} not-found-brand`} aria-label={`${SITE_CONFIG.shortBrandName} home`}>
          <span className={styles.brandName}>{SITE_CONFIG.shortBrandName}<span> · IHGC 2026</span></span>
        </Link>

        <p className={styles.eyebrow}>You seem to have taken a wrong turn</p>
        <h1 id="not-found-title" className={styles.code}>
          <span className="not-found-digit">4</span>
          <span className={`${styles.zero} not-found-digit`}>
            <span className={styles.screenReaderOnly}>0</span>
            <span className={`${styles.emblem} not-found-emblem`} aria-hidden="true">
              <Image src={SITE_CONFIG.logo.src} alt="" width={SITE_CONFIG.logo.width} height={SITE_CONFIG.logo.height} />
            </span>
          </span>
          <span className="not-found-digit">4</span>
          <span className={styles.screenReaderOnly}> — page not found</span>
        </h1>

        <div className={`${styles.message} not-found-message`}>
          <h2>This page is no longer on the map.</h2>
          <p>The link may be outdated, or the address may have been entered incorrectly.</p>
        </div>

        <div className={styles.actions}>
          <Link href="/" className={`${styles.homeButton} not-found-action`}>
            <MoveLeft size={17} aria-hidden="true" />
            Go Home
          </Link>
          <Link href="/contact" className={`${styles.helpLink} not-found-action`}>
            Get help <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.footer}>HOREMOW <span aria-hidden="true">·</span> {SITE_CONFIG.eventTitle}</div>
      </section>
    </main>
  );
}
