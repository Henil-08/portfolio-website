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

type Project = {
  title: string;
  subtitle: string;
  bullets: string[];
  tech: string[];
  links: { label: string; href: string; emoji: string }[];
};

const projects: Project[] = [
  {
    title: "AppSageAI 2.0",
    subtitle: "Privacy-focused resume analysis tool with generative AI",
    bullets: [
      "Integrated Gemini 2.5 Pro (VertexAI) with RAG pipeline (FAISS + HF embedding) to handle 20K+ daily chats with chat persistence",
      "Architected full-stack application with AES-256 encryption and rotating keys (GDPR compliant) in Firebase while maintaining <1s p99 TTFT for 600+ DAU",
    ],
    tech: ["RAG", "LangChain", "Gemini APIs", "Explainable AI", "Guardrails", "CI/CD"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/AppSageAI", emoji: "🧑🏻‍💻" },
      { label: "App Link", href: "https://appsageai-frontend-964026407675.us-central1.run.app", emoji: "🎧" },
    ],
  },
  {
    title: "Freemoji",
    subtitle: "Generates Apple Genmoji-style emojis for WhatsApp",
    bullets: [
      "Fine-tuned Flux.1-dev on 1,646 WhatsApp emojis using LoRA with DeepSpeed Zero-2, achieving model loss of 0.245",
      "Designed Prompt Assist (2-shot Prompting + Llama 3.3) to refine user inputs before fine-tuned model, improving emoji quality",
      "Boosted performance by 40% via GPU-accelerated inference",
    ],
    tech: ["Distributed Systems", "CUDA", "Fine-tuning", "vLLM", "Ollama"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/freemoji", emoji: "🧑🏻‍💻" },
      { label: "Medium", href: "https://medium.com/@henilgajjar08/freemoji-genmoji-for-whatsapp-23bed688dd99", emoji: "🗞️" },
    ],
  },
  {
    title: "Verta",
    subtitle: "Multi-agent shopping copilot combining multiple language models",
    bullets: [
      "Architected a chatbot with end-to-end multi-agent RAG, built backend with FastAPI, deployed on Google Cloud Run (Docker + Git Actions CI/CD), handling 20K queries/sec",
      "Evaluated with DeepEval (Correctness: 0.81, Answer Relevancy: 0.87), tracked with MLflow and LangSmith",
      "Optimized state management via layered Redis caching (1.5s p95 E2E, 250ms p95 TTFT)",
    ],
    tech: ["HuggingFace", "OpenAI APIs", "Microservices", "LLM Optimization", "BigData"],
    links: [
      { label: "GitHub", href: "https://github.com/eCom-dev5/verta-chatbot", emoji: "🧑🏻‍💻" },
    ],
  },
  {
    title: "End-to-End Kidney Tumor Classification",
    subtitle: "Medical imaging pipeline using deep learning",
    bullets: [
      "Built end-to-end image classification pipeline using modified VGG16 CNN model with PyTorch, achieving F1 score of 0.96",
      "Developed interpretable ML workflows with feature importance analysis via SHAP",
      "Automated data ingestion, model training, and evaluation pipelines using Airflow and DVC",
      "Containerized and deployed the trained model as a Flask app on AWS EC2 via Docker and Git Actions",
    ],
    tech: ["CNN", "PyTorch", "SHAP", "Airflow", "MLflow", "DVC", "Flask", "Docker"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/end-to-end-kidney-tumor-classification", emoji: "🧑🏻‍💻" },
    ],
  },
  {
    title: "Self-Driving Solar Vehicle",
    subtitle: "Autonomous vehicle using cone detection for track navigation",
    bullets: [
      "Built track-following autonomous solar vehicle by identifying 2 types of cones using OpenCV",
      "Improved model mAP to 0.93 using data augmentation and K-Means; deployed on-edge on Nvidia Jetson Nano",
      "Optimized end-to-end inference via pruning and quantization; achieved 120ms latency and 96.7% autonomous navigation accuracy",
      "Engineered a patented steering system (IND Patent: 363614-001)",
    ],
    tech: ["TensorFlow", "OpenCV", "CNN", "Embedded C", "Nvidia Jetson Nano"],
    links: [],
  },
  {
    title: "Fantasy Team Recommendation for IPL 2024",
    subtitle: "Cricket-specific team suggestion system using fine-tuned LLMs",
    bullets: [
      "Fine-tuned Gemma 2 using QLoRA on curated cricket dataset, achieving 10% ROUGE score improvement",
      "Established algorithm using NLTK for player performance analysis",
      "Leveraged prompt engineering for contextual team recommendations; 85% accurate team predictions",
    ],
    tech: ["QLoRA", "Gemma 2", "NLTK", "Transformers", "Prompt Engineering"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/Optimal-Fantasy-Sport-Recommender.git", emoji: "🧑🏻‍💻" },
    ],
  },
  {
    title: "Rent the Runway Recommender System",
    subtitle: "Hybrid recommendation engine for fashion rentals",
    bullets: [
      "Scraped product data and user reviews via BeautifulSoup; engineered preprocessing pipelines for text cleaning and feature extraction",
      "Developed hybrid recommendation using matrix factorization and cosine similarity",
      "Incorporated incremental SVD addressing cold-start problem, reducing system update time by 40%",
    ],
    tech: ["Collaborative Filtering", "SVD", "Cosine Similarity", "BeautifulSoup"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/Renttherunway-Recommender.git", emoji: "🧑🏻‍💻" },
    ],
  },
  {
    title: "Ultimate Frisbee Performance Metrics",
    subtitle: "Player rating and impact evaluation system",
    bullets: [
      "Engineered player rating models by combining XGBoost and mixed-effects linear modeling, improving accuracy by 20%",
      "Designed on/off plus-minus models with Bayesian modeling",
      "Developed composite scoring metrics integrating multiple player features, improving ranking robustness by 15%",
    ],
    tech: ["XGBoost", "Bayesian Modeling", "ML Pipelines", "DVC", "MLFlow"],
    links: [],
  },
  {
    title: "SQL Database Chatbot",
    subtitle: "Natural language interface for database queries",
    bullets: [
      "Developed an AI Agent with SQLAlchemy ORM supporting dynamic SQLite and MySQL databases",
      "Created SQL Database Toolkit with Gemma 2 zero-shot question answering, enhancing the chatbot's ability to handle complex SQL queries accurately",
    ],
    tech: ["LangChain", "SQLAlchemy ORM", "Gemma 2", "Groq"],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/chat-with-sql", emoji: "🧑🏻‍💻" },
    ],
  },
];

export default function ProjectsPage() {
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
            Projects
          </h1>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[28px] font-bold text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              10+
            </span>
            <span className="text-[11px] text-[#676767] font-medium">End-to-End</span>
            <span className="text-[12px] font-semibold text-[#010202]">Projects Owned</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Projects grid */}
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-60px" }}
        className="flex flex-col gap-0"
      >
        {projects.map((project, i) => (
          <motion.div
            key={project.title}
            variants={fadeUp}
            className={`flex flex-col gap-5 py-10 ${
              i < projects.length - 1 ? "border-b border-[#eeeeee]" : ""
            }`}
          >
            {/* Top: title + links */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2
                  className="text-[17px] font-bold text-[#010202] leading-tight"
                  style={{ fontFamily: "Figtree, sans-serif" }}
                >
                  {project.title}
                </h2>
                <p
                  className="text-[13px] text-[#676767] font-medium mt-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {project.subtitle}
                </p>
              </div>
              {project.links.length > 0 && (
                <div className="flex gap-2 flex-shrink-0">
                  {project.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[#d6d6d6] rounded-full text-[#010202] hover:border-[#010202] transition-colors"
                    >
                      <span>{link.emoji}</span>
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Bullets */}
            <ul className="flex flex-col gap-2.5">
              {project.bullets.map((bullet, j) => (
                <li key={j} className="flex gap-3 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d6d6d6] flex-shrink-0 mt-[7px]" />
                  <span
                    className="text-[14px] font-[450] text-[#010202] leading-[1.7]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>

            {/* Tech tags */}
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 text-[11px] font-semibold bg-[#f5f5f5] text-[#676767] rounded-full border border-[#eeeeee]"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
