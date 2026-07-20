"use client";

import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

type Experience = {
  company: string;
  role: string;
  period: string;
  type: "Internship" | "Full-Time" | "Extracurricular";
  bullets: { text: string; highlights?: string[] }[];
};

const experiences: Experience[] = [
  {
    company: "Waters Corporation",
    role: "GenAI and ML Intern",
    period: "Jun 2025 — Aug 2025",
    type: "Internship",
    bullets: [
      {
        text: "Implemented LLM evaluation framework for AI search engine automating multi-dimensional {RAGAS} and LLM-as-a-Judge testing",
        highlights: ["RAGAS"],
      },
      {
        text: "Synthetically generated 2K+ test samples with Claude Sonnet 4 via {AWS Bedrock} across 3 query types, cutting SME review time by 50%",
        highlights: ["AWS Bedrock"],
      },
      {
        text: "Integrated retrieval pipelines ({OpenSearch + S3}) to streamline 400K+ chunks, optimizing resource & scaling by 2.5× across teams",
        highlights: ["OpenSearch + S3"],
      },
      {
        text: "Ensured human-in-the-loop automation with {WebSocket}-based {Streamlit} dashboard for SMEs to track metrics and drive AI improvements",
        highlights: ["WebSocket", "Streamlit"],
      },
      {
        text: "Closed 24 story points in one sprint and live-demoed an internal feature to 200+ employees across US/India, doubling team productivity",
        highlights: [],
      },
    ],
  },
  {
    company: "Edlight, PBC",
    role: "Machine Learning Intern",
    period: "Sep 2024 — Dec 2024",
    type: "Internship",
    bullets: [
      {
        text: "Delivered multi-agent chatbot with guardrails using {LangGraph} and {FastAPI}, with streaming RESTful API endpoints on {AWS Lambda}",
        highlights: ["LangGraph", "FastAPI", "AWS Lambda"],
      },
      {
        text: "Achieved {180ms p95 TTFT} via dynamic agent routing: SQL for curriculum, RAG for resources, direct responses for general questions",
        highlights: ["180ms p95 TTFT"],
      },
      {
        text: "Architected SQL-Agent with custom tools to dynamically fetch data from multiple PostgreSQL tables using natural-language queries",
        highlights: [],
      },
      {
        text: "Improved ChromaDB retrieval using CRAG and {reranker}, increasing faithfulness (+13.4%) and reducing hallucinations (−32.5%)",
        highlights: ["reranker"],
      },
      {
        text: "Optimized {multi-modal API} with queuing and threading to reduce latency by 80% while sustaining {30K+ monthly requests}",
        highlights: ["multi-modal API", "30K+ monthly requests"],
      },
      {
        text: "Built assignment image-to-IEP goals matching system using Qwen2-VL-7B-Instruct that {won week-long hackathon} and became Q1 2025's biggest product release",
        highlights: ["won week-long hackathon"],
      },
    ],
  },
  {
    company: "Impacter AI",
    role: "AI Developer Intern",
    period: "Sep 2024 — Dec 2024",
    type: "Internship",
    bullets: [
      {
        text: "Built 'SalesPal', AI-powered real-estate sales agent with {Azure OpenAI}, {CosmosDB}, and Databricks to automate personalized client pitching",
        highlights: ["Azure OpenAI", "CosmosDB"],
      },
      {
        text: "Integrated {CrewAI}-based email and call agents (SendGrid, Twilio, {MCP}), automating contextual outreach to 1K+ concurrent users",
        highlights: ["CrewAI", "MCP"],
      },
      {
        text: "Wrapped SalesPal in scalable Flask web app, containerized with {Docker}, deployed on {Azure Kubernetes Service} with CI/CD pipelines",
        highlights: ["Docker", "Azure Kubernetes Service"],
      },
    ],
  },
  {
    company: "Hyperlab Sportech",
    role: "Founding ML Engineer",
    period: "Jan 2022 — Aug 2023",
    type: "Full-Time",
    bullets: [
      {
        text: "Launched ML-driven iOS app using {Swift} with {50K+ downloads} and {20K+ DAU}, secured $100K funding via Shark Tank and angel investors",
        highlights: ["Swift", "50K+ downloads", "20K+ DAU"],
      },
      {
        text: "Built multimodal AI Coach (LangChain, GPT-4, Llama 3, AstraDB) for vision and text processing with FastAPI backed inference",
        highlights: [],
      },
      {
        text: "Created AstraDB vector store from 30K+ files via semantic chunking and Fine-Tuned Llama 3 to reduce hallucinations by 60%",
        highlights: [],
      },
      {
        text: "Developed {ETL pipelines} using {AWS Glue, Spark, and Kinesis} to process 10TB+ of athlete performance data",
        highlights: ["ETL pipelines", "AWS Glue, Spark, and Kinesis"],
      },
      {
        text: "Developed CNN-based Table Tennis ball prediction system, trained on AWS SageMaker using PyTorch and unified data warehouse",
        highlights: [],
      },
      {
        text: "Performed {Multi-GPU Distributed Training} of LSTM model with Ray on {4 Nvidia GPUs}, containerized and deployed on AWS EC2",
        highlights: ["Multi-GPU Distributed Training", "4 Nvidia GPUs"],
      },
    ],
  },
  {
    company: "Nirma University",
    role: "Student Researcher",
    period: "Jan 2022 — May 2022",
    type: "Extracurricular",
    bullets: [
      {
        text: "Curated a {dataset of a Li-ion battery} pack encompassing over 150K rows, extracting actionable insights",
        highlights: ["dataset of a Li-ion battery"],
      },
      {
        text: "Utilized {Random Forest regression} model to predict optimal temperature during charging/discharging, improving battery health by 12%",
        highlights: ["Random Forest regression"],
      },
      {
        text: "Employed {clustering techniques} to understand current rates and temperature over 1,300 charge-discharge cycles",
        highlights: ["clustering techniques"],
      },
    ],
  },
  {
    company: "Team Stallions",
    role: "Captain",
    period: "Jan 2021 — Dec 2021",
    type: "Extracurricular",
    bullets: [
      {
        text: "Trained and {managed a team of 40 students}, leading development of 'Mercury,' an Electric Solar Vehicle with 150km range and 60kmph top speed",
        highlights: ["managed a team of 40 students"],
      },
      {
        text: "Secured {decisive victory} in Asia's Largest Electric Solar Vehicle Competition 2021, outperforming by 500+ points and {earning 8 out of 11 trophies}",
        highlights: ["decisive victory", "earning 8 out of 11 trophies"],
      },
      {
        text: "Engineered a {patented steering system} for the Vehicle's Autonomous System, winning 'Best Autonomous Round' Award",
        highlights: ["patented steering system"],
      },
    ],
  },
];

const typeBadge: Record<Experience["type"], string> = {
  Internship: "bg-[#f5f5f5] text-[#676767]",
  "Full-Time": "bg-[#010202] text-white",
  Extracurricular: "bg-[#f5f5f5] text-[#676767]",
};

function renderBullet(text: string, highlights: string[] = []) {
  if (!highlights.length) return text.replace(/\{([^}]+)\}/g, "$1");
  const parts: (string | React.ReactElement)[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const term = match[1];
    parts.push(
      <strong key={match.index} className="font-semibold text-[#010202]">
        {term}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export default function ExperiencePage() {
  return (
    <section className="w-[85%] mx-auto py-16">
      {/* Header stats */}
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
            My work experience
          </h1>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[28px] font-bold text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              1+
            </span>
            <span className="text-[11px] text-[#676767] font-medium">Years of</span>
            <span className="text-[12px] font-semibold text-[#010202]">Internships</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[28px] font-bold text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              2+
            </span>
            <span className="text-[11px] text-[#676767] font-medium">Years of</span>
            <span className="text-[12px] font-semibold text-[#010202]">0→1 Startup</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Experience list */}
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-60px" }}
        className="flex flex-col gap-0"
      >
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.company}
            variants={fadeUp}
            className={`flex flex-col lg:flex-row gap-6 lg:gap-10 py-10 ${
              i < experiences.length - 1 ? "border-b border-[#eeeeee]" : ""
            }`}
          >
            {/* Left: company/role/date */}
            <div className="flex-shrink-0 lg:w-[220px] flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${typeBadge[exp.type]}`}
                >
                  {exp.type}
                </span>
              </div>
              <h2
                className="text-[16px] font-bold text-[#010202] leading-tight"
                style={{ fontFamily: "Figtree, sans-serif" }}
              >
                {exp.company}
              </h2>
              <p
                className="text-[13px] font-medium text-[#676767]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {exp.role}
              </p>
              <p
                className="text-[12px] text-[#999]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {exp.period}
              </p>
            </div>

            {/* Right: bullets */}
            <ul className="flex flex-col gap-3 flex-1">
              {exp.bullets.map((bullet, j) => (
                <li key={j} className="flex gap-3 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d6d6d6] flex-shrink-0 mt-[7px]" />
                  <span
                    className="text-[14px] font-[450] text-[#010202] leading-[1.7]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {renderBullet(bullet.text, bullet.highlights)}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
