"use client";

import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.09 } },
};

type Publication = {
  title: string;
  venue: string;
  date: string;
  status?: string;
  link?: string;
};

type Patent = {
  title: string;
  number: string;
  date: string;
  status?: string;
};

const publications: Publication[] = [
  {
    title: "HAEE: A Heterogeneous Agentic Execution Engine for Low-Latency RAG Serving",
    venue: "MLSys",
    date: "",
    status: "Under Review",
  },
  {
    title: "A Comparative Analysis of Various Deep-Learning Models for Noise Suppression",
    venue: "EAI",
    date: "Jan 2024",
  },
  {
    title: "A comprehensive study on lane detecting autonomous car using computer vision",
    venue: "Elsevier",
    date: "Dec 2023",
  },
  {
    title: "Enhancing home automation: a smart system with M5 stack and multiple control interfaces",
    venue: "IEEE Xplore",
    date: "Oct 2023",
  },
  {
    title: "Low Voltage Systems for Electric ATVs",
    venue: "IEEE Xplore",
    date: "Aug 2023",
  },
  {
    title: "Comparative analysis of CNN models for self-driving cars in a simulated environment",
    venue: "IEEE Xplore",
    date: "Feb 2023",
  },
];

const patents: Patent[] = [
  {
    title: "Steering System for Autonomous Solar Electric Vehicle",
    number: "US Patent: INV-26057",
    date: "",
    status: "Patent Pending",
  },
  {
    title: "Steering System for Autonomous Solar Electric Vehicle",
    number: "IND Patent: 363614-001",
    date: "Jul 2022",
  },
];

const venueBg: Record<string, string> = {
  MLSys: "bg-[#bdff31] text-[#010202]",
  EAI: "bg-[#f5f5f5] text-[#676767]",
  Elsevier: "bg-[#f5f5f5] text-[#676767]",
  "IEEE Xplore": "bg-[#f5f5f5] text-[#676767]",
};

export default function PublicationsPage() {
  return (
    <section className="w-[85%] mx-auto py-16">
      {/* Header */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="mb-14"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
          <h1
            className="text-[20px] font-bold text-[#010202] whitespace-nowrap"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Publications
          </h1>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[28px] font-bold text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              45+
            </span>
            <span className="text-[11px] text-[#676767] font-medium">Total</span>
            <span className="text-[12px] font-semibold text-[#010202]">Citations</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[28px] font-bold text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              7+
            </span>
            <span className="text-[11px] text-[#676767] font-medium">Peer-Reviewed</span>
            <span className="text-[12px] font-semibold text-[#010202]">Publications</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Papers */}
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-60px" }}
        className="mb-12"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
          <h2
            className="text-[15px] font-semibold text-[#010202] whitespace-nowrap"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Research Papers
          </h2>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        <div className="flex flex-col gap-0">
          {publications.map((pub, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`flex flex-col sm:flex-row gap-4 sm:gap-8 py-6 ${
                i < publications.length - 1 ? "border-b border-[#eeeeee]" : ""
              }`}
            >
              {/* Left: venue + date */}
              <div className="flex-shrink-0 sm:w-[160px] flex flex-col gap-2">
                <span
                  className={`self-start text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    venueBg[pub.venue] ?? "bg-[#f5f5f5] text-[#676767]"
                  }`}
                >
                  {pub.venue}
                </span>
                {pub.status ? (
                  <span className="text-[11px] font-medium text-[#2dca72]">
                    {pub.status}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#999] font-medium">{pub.date}</span>
                )}
              </div>

              {/* Right: title */}
              <p
                className="flex-1 text-[14px] font-[500] text-[#010202] leading-[1.65]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {pub.title}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Patents */}
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-60px" }}
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
          <h2
            className="text-[15px] font-semibold text-[#010202] whitespace-nowrap"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Patents
          </h2>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        <div className="flex flex-col gap-0">
          {patents.map((patent, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`flex flex-col sm:flex-row gap-4 sm:gap-8 py-6 ${
                i < patents.length - 1 ? "border-b border-[#eeeeee]" : ""
              }`}
            >
              <div className="flex-shrink-0 sm:w-[160px] flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-[#676767] font-mono">
                  {patent.number}
                </span>
                {patent.status ? (
                  <span className="text-[11px] font-medium text-[#f59e0b]">
                    {patent.status}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#999] font-medium">{patent.date}</span>
                )}
              </div>
              <p
                className="flex-1 text-[14px] font-[500] text-[#010202] leading-[1.65]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {patent.title}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
