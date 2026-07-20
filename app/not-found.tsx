"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <section className="w-[85%] mx-auto py-24 flex flex-col items-start gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <span
          className="text-[80px] font-bold text-[#eeeeee] leading-none"
          style={{ fontFamily: "Figtree, sans-serif" }}
        >
          404
        </span>
        <h1
          className="text-[24px] font-bold text-[#010202]"
          style={{ fontFamily: "Figtree, sans-serif" }}
        >
          Page not found
        </h1>
        <p
          className="text-[14px] font-medium text-[#676767] max-w-[360px]"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold bg-[#010202] text-white rounded-full hover:bg-[#282833] transition-colors"
        >
          ← Back home
        </Link>
      </motion.div>
    </section>
  );
}
