"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const credentials = [
  { number: "3+", label: "Years of", sub: "Industry Experience" },
  { number: "6+", label: "Years of", sub: "Python, SQL, Cloud" },
  { number: "5+", label: "Years of", sub: "ML, DL, NLP, CV" },
  { number: "2+", label: "Years of", sub: "LLMs, Agents, RAG" },
  { number: "7+", label: "Publications in", sub: "MLSys, IEEE, Elsevier" },
  { number: "10+", label: "End-to-End", sub: "ML Projects Owned" },
];

const expertise = [
  "Production ML",
  "Agentic AI",
  "RAG",
  "LLM Fine-Tuning",
  "Distributed Training",
  "Deep Learning",
  "Model Evaluations",
  "Cloud Architecture",
  "Inference Optimization",
  "CI/CD/CT/CM",
  "Generative AI",
  "Traditional ML",
  "Computer Vision",
];

const toolbox = [
  {
    category: "Languages",
    items: ["Python", "SQL", "Git", "Bash", "CUDA", "Swift", "TypeScript", "C++", "HTML/CSS"],
  },
  {
    category: "Frameworks",
    items: [
      "PyTorch", "TensorFlow", "LangGraph", "LangChain", "Transformers",
      "Scikit-learn", "OpenCV", "Flask", "FastAPI", "Streamlit", "React",
    ],
  },
  {
    category: "Training — Evaluation — Inference",
    items: ["LoRA", "QLoRA", "DeepSpeed", "MLFlow", "WandB", "vLLM", "Ollama", "DeepEval", "RAGAS"],
  },
  {
    category: "Big Data / RDBMS / NoSQL / VectorDB",
    items: ["Spark", "Airflow", "PostgreSQL", "MongoDB", "Redis", "ChromaDB", "Pinecone", "Weaviate", "FAISS"],
  },
  {
    category: "AWS",
    items: ["Lambda", "EC2", "S3", "SageMaker", "Bedrock", "Glue", "Kinesis", "OpenSearch"],
  },
  {
    category: "GCP",
    items: ["Cloud Run", "VertexAI", "Cloud Functions", "Firebase"],
  },
  {
    category: "Azure",
    items: ["OpenAI", "CosmosDB", "Kubernetes Service", "Databricks"],
  },
  {
    category: "Deploy / Monitor / Web",
    items: ["Docker", "Kubernetes", "CI/CD", "Git Actions", "DVC", "LangSmith", "Grafana"],
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="w-[85%] mx-auto pt-16 pb-14 md:pt-20 md:pb-16">
        <motion.div
          className="flex flex-col md:flex-row gap-10 md:gap-14 items-start"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {/* Profile Photo */}
          <motion.div variants={fadeUp} className="flex-shrink-0">
            <div className="relative w-[200px] md:w-[240px] aspect-[0.875] rounded-2xl overflow-hidden bg-[#d9d9d9]">
              <Image
                src="/stsjt3zthwrfbbf4gwcyfr8r1y.jpg"
                alt="Henil Gajjar"
                fill
                className="object-cover object-top"
                priority
              />
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-start gap-5 pt-1 flex-1"
          >
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2dca72] flex-shrink-0 animate-pulse" />
              <span
                className="text-[13px] font-medium text-[#676767]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Seeking full-time ML roles
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-[34px] md:text-[40px] font-bold leading-[1.18] text-[#010202] tracking-tight"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              Hey there! 👋
              <br />
              I&apos;m{" "}
              <span className="italic">Henil</span> and I&apos;m a
              <br />
              Machine Learning
              <br />
              Engineer{" "}
              <span className="text-[#676767]">from</span> Boston, MA
            </h1>

            {/* Sub */}
            <p
              className="text-[15px] font-medium text-[#676767] max-w-[500px] leading-relaxed"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              I build AI that actually works in the real world — production LLM
              systems, agentic pipelines, and inference-optimized deployments
              that scale.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Link
                href="/contact"
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold bg-[#010202] text-white rounded-full hover:bg-[#282833] transition-colors"
              >
                👋 Let&apos;s Talk
              </Link>
              <a
                href="https://drive.google.com/file/d/1VfI0pMkejigWso1PqJZSfTkGSP4T95FB/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold border border-[#d6d6d6] text-[#010202] rounded-full hover:border-[#010202] transition-colors"
              >
                🔖 My Resume
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Credentials Bar */}
      <section className="border-t border-[#eeeeee]">
        <div className="w-[85%] mx-auto py-10">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {credentials.map((cred) => (
              <motion.div key={cred.number} variants={fadeUp} className="flex flex-col gap-0.5">
                <span
                  className="text-[30px] md:text-[32px] font-bold text-[#010202] leading-none"
                  style={{ fontFamily: "Figtree, sans-serif" }}
                >
                  {cred.number}
                </span>
                <span
                  className="text-[11px] text-[#676767] font-medium leading-tight mt-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {cred.label}
                </span>
                <span
                  className="text-[12px] text-[#010202] font-semibold leading-tight"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {cred.sub}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Me */}
      <section id="about" className="border-t border-[#eeeeee] scroll-mt-20">
        <div className="w-[85%] mx-auto py-16">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div
              variants={fadeUp}
              className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start"
            >
              {/* Second photo */}
              <div className="flex-shrink-0">
                <div className="relative w-[180px] md:w-[200px] aspect-[0.875] rounded-2xl overflow-hidden bg-[#d9d9d9]">
                  <Image
                    src="/mklwxqmmxe9mrvxgdfesmlsu95o.jpg"
                    alt="Henil Gajjar"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>

              {/* About text */}
              <div className="flex flex-col gap-5 flex-1">
                <div className="flex items-center gap-3">
                  <h2
                    className="text-[20px] font-bold text-[#010202]"
                    style={{ fontFamily: "Figtree, sans-serif" }}
                  >
                    About Me
                  </h2>
                  <div className="h-px flex-1 bg-[#eeeeee]" />
                </div>

                <div
                  className="flex flex-col gap-4 text-[15px] font-[450] text-[#010202] leading-[1.75]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <p>
                    My journey into ML started in an unexpected place — I was preparing an autonomous car
                    for an electric vehicle competition during my undergrad in Electronics and Communication
                    Engineering. As team captain, I dove headfirst into computer vision and machine learning,
                    and honestly, I was hooked. That curiosity led me to join{" "}
                    <strong>Hyperlab</strong> as a Founding ML Engineer, where we built an ML-driven sports
                    analytics app that got us featured on{" "}
                    <strong>Shark Tank India</strong> — easily one of the proudest moments of my life.
                    But more than the spotlight, Hyperlab taught me how to ship products people actually use,
                    close deals, optimize under constraints, and build fast.
                  </p>
                  <p>
                    I moved to the US to deepen my expertise in Data Science at Northeastern, and the GenAI
                    boom happened. Since then, I&apos;ve been laser-focused on agentic AI, RAG, LLM fine-tuning,
                    and production systems. Through three co-ops at{" "}
                    <strong>Waters Corporation</strong>,{" "}
                    <strong>Edlight</strong>, and{" "}
                    <strong>ImpacterAI</strong>, I&apos;ve built chatbots, optimized inference, and automated
                    LLM evaluations. I&apos;ve learned that great ML engineering isn&apos;t just about knowing
                    the frameworks — it&apos;s about making smart tradeoffs, asking hard questions, and building
                    systems that scale under real-world pressure.
                  </p>
                  <p>
                    Now wrapping up my{" "}
                    <strong>MS in Data Science (4.0 GPA, Dec 2025)</strong>, I&apos;m actively seeking
                    full-time ML Engineer roles starting January 2026 where I can continue building
                    production AI that makes an impact.
                  </p>
                </div>

                {/* Expertise tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {expertise.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-[12px] font-medium bg-[#f5f5f5] text-[#010202] rounded-full border border-[#eeeeee]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Toolbox */}
      <section id="skills" className="border-t border-[#eeeeee]">
        <div className="w-[85%] mx-auto py-16">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-10">
              <h2
                className="text-[20px] font-bold text-[#010202] whitespace-nowrap"
                style={{ fontFamily: "Figtree, sans-serif" }}
              >
                My Toolbox
              </h2>
              <div className="h-px flex-1 bg-[#eeeeee]" />
            </motion.div>

            <div className="flex flex-col">
              {toolbox.map((section, i) => (
                <motion.div
                  key={section.category}
                  variants={fadeUp}
                  className={`flex flex-col sm:flex-row gap-4 sm:gap-8 py-5 ${
                    i < toolbox.length - 1 ? "border-b border-[#eeeeee]" : ""
                  }`}
                >
                  <div className="w-full sm:w-[260px] flex-shrink-0">
                    <span
                      className="text-[11px] font-semibold text-[#676767] uppercase tracking-wider"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {section.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 text-[12px] font-medium bg-white text-[#010202] rounded-full border border-[#d6d6d6] hover:border-[#010202] transition-colors cursor-default"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
