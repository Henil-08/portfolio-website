export type Project = {
  slug: string;
  name: string;
  tagline: string;
  headline: { value: string; label: string };
  stack: string[];
  points: string[];
  links: { label: string; href: string }[];
  sideQuest?: boolean;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    slug: "rtl-coverage-agents",
    name: "AI in Verification",
    tagline: "Seven agents that write and run chip tests",
    headline: { value: "10/10", label: "planted bugs caught" },
    stack: ["LangGraph", "SystemVerilog", "UVM", "Verilator", "RAG", "MCP"],
    points: [
      "A 7-agent LangGraph system that plans, writes and runs SystemVerilog/UVM tests for RTL designs end to end",
      "Grounds the test plan in cited passages from the spec sheet with hybrid RAG (BM25 + bge-small, RRF)",
      "Closed 100% functional coverage on a dual-port RAM in 43 cycles over 3 iterations",
      "Mutation tested the AI-written testbenches: stuck-at, inversion, swap, off-by-one",
      "The whole toolchain is an MCP server, so Claude Code can verify RTL directly",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/rtl-coverage-agents" },
    ],
    sideQuest: true,
    featured: true,
  },
  {
    slug: "verilog-coder",
    name: "Verilog Coder",
    tagline: "Small models that write better Verilog than big ones",
    headline: { value: "17.3 → 44.9%", label: "pass@1" },
    stack: ["LoRA", "QLoRA", "DeepSpeed", "vLLM", "MLX", "W&B"],
    points: [
      "Fine-tuned Qwen2.5-Coder 1.5B to 7B over 19 LoRA, QLoRA and full runs with DeepSpeed ZeRO-2 on H100/H200s",
      "Cleaned 131K OpenRTLSet modules, removed 54K fuzzer rows, held out a compiling test set",
      "Beat a base model 9x its size on VerilogEval with Verilator differential testing",
      "Serves through MLX, vLLM or Ollama automatically. 4-bit gave 3.5x faster decode",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/verilog-coder-ft" },
      { label: "Hugging Face", href: "https://huggingface.co/henil08/verilog-coder-7b" },
    ],
    sideQuest: true,
    featured: true,
  },
  {
    slug: "appsage",
    name: "AppSageAI 2.0",
    tagline: "A resume analyzer that keeps your data yours",
    headline: { value: "<1s", label: "p99 TTFT at 600+ DAU" },
    stack: ["Gemini 2.5", "Vertex AI", "FAISS", "FastAPI", "TypeScript", "Cloud Run"],
    points: [
      "Gemini 2.5 Pro with a FAISS RAG pipeline handling 20K+ daily chats",
      "Full stack TypeScript + FastAPI with SSE streaming, JWT auth and CI/CD on Cloud Run",
      "AES-256 with rotating keys in Firebase, GDPR compliant",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/AppSageAI" },
      { label: "Live app", href: "https://appsageai-frontend-964026407675.us-central1.run.app" },
    ],
    featured: true,
  },
  {
    slug: "freemoji",
    name: "Freemoji",
    tagline: "Apple's Genmoji, but for WhatsApp",
    headline: { value: "+40%", label: "inference speed" },
    stack: ["Flux.1-dev", "LoRA", "DeepSpeed", "vLLM", "MLX", "CUDA"],
    points: [
      "Fine-tuned Flux.1-dev on 1,646 WhatsApp emojis with LoRA and ZeRO-2 on 2 A100s",
      "Prompt Assist (Llama 3.3, 2-shot) cleans up what you type before it hits the model",
      "GPU inference with vLLM/MLX + Diffusers and Int8 quantization",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/freemoji" },
      {
        label: "Write-up",
        href: "https://medium.com/@henilgajjar08/freemoji-genmoji-for-whatsapp-23bed688dd99",
      },
    ],
    featured: true,
  },
  {
    slug: "verta",
    name: "Verta",
    tagline: "A personal shopping copilot",
    headline: { value: "250ms", label: "p95 TTFT under 6x load" },
    stack: ["LangGraph", "FAISS", "BigQuery", "Redis", "DeepEval", "MLflow"],
    points: [
      "Multi-agent RAG across 4 LLMs with guardrails, FAISS and BigQuery",
      "FastAPI on Cloud Run with CI/CD, built for 20K queries/sec",
      "Layered Redis caching made responses 3x faster",
      "DeepEval correctness 0.81, answer relevancy 0.87",
    ],
    links: [{ label: "GitHub", href: "https://github.com/eCom-dev5/verta-chatbot" }],
  },
  {
    slug: "self-driving",
    name: "Self-Driving Solar Vehicle",
    tagline: "Where it all started",
    headline: { value: "24 FPS", label: "real-time steering" },
    stack: ["TensorFlow", "OpenCV", "Jetson Nano", "STM32", "Embedded C"],
    points: [
      "Custom CNN to detect two kinds of cones, mAP 0.93 after augmentation and K-Means anchors",
      "Ran on a Jetson Nano talking to an STM32 over drivers I wrote in Embedded C",
      "Pruned and quantized down to 120ms latency, 96.7% navigation accuracy",
    ],
    links: [],
  },
  {
    slug: "ipl-fantasy",
    name: "IPL Fantasy Picker",
    tagline: "I fine-tuned an LLM to pick my fantasy team",
    headline: { value: "85%", label: "team prediction accuracy" },
    stack: ["Gemma 2", "QLoRA", "NLTK", "Transformers"],
    points: [
      "QLoRA on Gemma 2 with cricket data, +10% ROUGE on cricket text",
      "NLTK extraction of player stats and scorecards from messy IPL history",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/Optimal-Fantasy-Sport-Recommender" },
    ],
  },
  {
    slug: "kidney",
    name: "Kidney Tumor Classification",
    tagline: "End-to-end medical imaging pipeline",
    headline: { value: "0.96", label: "F1 score" },
    stack: ["PyTorch", "Airflow", "DVC", "SHAP", "Docker", "EC2"],
    points: [
      "Modified VGG16 in PyTorch with SHAP explanations and calibration",
      "Airflow + DVC pipelines, served as a Flask app on EC2",
    ],
    links: [
      {
        label: "GitHub",
        href: "https://github.com/Henil-08/end-to-end-kidney-tumor-classification",
      },
    ],
  },
  {
    slug: "frisbee",
    name: "Ultimate Frisbee Ratings",
    tagline: "Plus-minus for a sport that never had one",
    headline: { value: "+20%", label: "predictive accuracy" },
    stack: ["XGBoost", "Bayesian", "Mixed effects", "MLflow"],
    points: [
      "Player ratings from XGBoost plus mixed-effects models",
      "Bayesian on/off plus-minus for offensive and defensive impact",
    ],
    links: [],
  },
  {
    slug: "runway",
    name: "Rent the Runway Recommender",
    tagline: "Hybrid fashion recommendations",
    headline: { value: "-40%", label: "update time" },
    stack: ["SVD", "Collaborative filtering", "BeautifulSoup"],
    points: [
      "Matrix factorization plus cosine content similarity",
      "Incremental SVD for cold-start users and products",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Henil-08/Renttherunway-Recommender" },
    ],
  },
  {
    slug: "sql-chat",
    name: "Chat with SQL",
    tagline: "Ask your database in plain English",
    headline: { value: "2", label: "databases, one agent" },
    stack: ["LangChain", "Gemma 2", "Groq", "SQLAlchemy"],
    points: [
      "SQL agent on Gemma 2 through Groq that works over SQLite and MySQL",
      "Custom SQL toolkit for zero-shot answers on complex queries",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/chat-with-sql" }],
  },
];
