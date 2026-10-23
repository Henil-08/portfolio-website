export const DOMAINS = [
  { id: "agents", label: "Agents and LLM systems" },
  { id: "genai", label: "Fine-tuning and generative AI" },
  { id: "hardware", label: "AI for hardware" },
  { id: "vision", label: "Computer vision and robotics" },
  { id: "ml", label: "ML and data" },
] as const;

export type Domain = (typeof DOMAINS)[number]["id"];

export type Project = {
  slug: string;
  domain: Domain;
  name: string;
  tagline: string;
  headline: { value: string; label: string };
  stack: string[];
  points: string[];
  links: { label: string; href: string }[];
  featured?: boolean;
};

export const projects: Project[] = [
  {
    slug: "rtl-coverage-agents",
    domain: "hardware",
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
    featured: true,
  },
  {
    slug: "verilog-coder",
    domain: "hardware",
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
    featured: true,
  },
  {
    slug: "appsage",
    domain: "agents",
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
    domain: "genai",
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
    domain: "agents",
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
    domain: "vision",
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
    domain: "genai",
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
    domain: "vision",
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
    domain: "ml",
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
    domain: "ml",
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
    domain: "agents",
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
  {
    slug: "elder-knowledge",
    domain: "agents",
    name: "Elder Knowledge AI",
    tagline: "Turning oral histories into a searchable archive",
    headline: { value: "Audio → RAG", label: "speech to semantic search" },
    stack: ["Speech recognition", "Embeddings", "Semantic search", "Python"],
    points: [
      "Transcribes recorded oral histories with automatic speech recognition",
      "Cleans, normalises and semantically tags the transcripts",
      "Embeds them into a searchable, meaning-aware digital archive",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/Elder-Knowledge-AI" }],
  },
  {
    slug: "gpt-from-scratch",
    domain: "genai",
    name: "GPT from Scratch",
    tagline: "A transformer written by hand, no shortcuts",
    headline: { value: "EN → IT", label: "translation, trained from zero" },
    stack: ["PyTorch", "Transformers", "Beam search", "Docker", "EC2"],
    points: [
      "Encoder-decoder transformer implemented from scratch in PyTorch, trained on OPUS Books",
      "Own WordLevel tokenizer, greedy and beam search decoding",
      "Evaluated with BLEU, WER and CER; served with Streamlit on a GPU EC2 box",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/GPT-from-scratch" }],
  },
  {
    slug: "api-anomaly",
    domain: "ml",
    name: "API Traffic Anomaly Detection",
    tagline: "Catching latency spikes and error storms",
    headline: { value: "LSTM-AE", label: "reconstruction-error detector" },
    stack: ["PyTorch", "LSTM Autoencoder", "MLflow", "Streamlit"],
    points: [
      "End-to-end MLOps pipeline that turns API gateway logs into time series",
      "LSTM autoencoder flags windows with high reconstruction error",
      "Runs and ROC-AUC tracked in MLflow, insights in a Streamlit dashboard",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/API-traffic-anomaly-detection" }],
  },
  {
    slug: "resume-parser",
    domain: "agents",
    name: "Resume Parser",
    tagline: "CVs in, structured matches out",
    headline: { value: "PDF → JD", label: "resume to job matching" },
    stack: ["Python", "NLP", "Hugging Face"],
    points: [
      "Extracts the relevant details from PDF resumes",
      "Matches them against job descriptions from a Hugging Face dataset",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/Parse-Resume" }],
  },
  {
    slug: "pi-car",
    domain: "vision",
    name: "Pi-Car",
    tagline: "A tiny self-driving RC car on a budget",
    headline: { value: "RPi + Arduino", label: "lane following over I2C" },
    stack: ["Raspberry Pi", "Arduino", "OpenCV", "Hough transform"],
    points: [
      "Detects green lane lines with OpenCV and Hough line transforms",
      "Raspberry Pi as the brain, Arduino Uno driving the motors over I2C",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/Pi-Car" }],
  },
  {
    slug: "gesture-control",
    domain: "vision",
    name: "Gesture Volume Control",
    tagline: "Pinch the air to change the volume",
    headline: { value: "2 fingers", label: "hand-tracked control" },
    stack: ["OpenCV", "Hand tracking", "Python"],
    points: ["Tracks your hand from a webcam and maps the pinch distance to system volume"],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/Gesture-Volume-Control" }],
  },
  {
    slug: "youtube-blog",
    domain: "agents",
    name: "YouTube Video Blog Generator",
    tagline: "A CrewAI team that turns videos into blog posts",
    headline: { value: "Video → Blog", label: "sequential agent crew" },
    stack: ["CrewAI", "GPT-4o", "LangChain"],
    points: [
      "Sequential agent crew with memory and caching that automates content creation from YouTube",
      "Specialised agents search channels, transcribe videos and write full blog posts",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/Youtube-Video-Blog" }],
  },
  {
    slug: "rag-doc-qa",
    domain: "agents",
    name: "RAG Document Q&A",
    tagline: "Chat with a stack of PDFs, with memory",
    headline: { value: "Multi-doc", label: "conversational RAG" },
    stack: ["Groq", "Gemma 2", "FAISS", "LangChain", "Streamlit"],
    points: [
      "Multi-document chatbot over PDFs using ChatGroq and Gemma 2",
      "FAISS retrieval with recursive splitting, and stateful chat history across turns",
    ],
    links: [{ label: "GitHub", href: "https://github.com/Henil-08/RAG-Document-QandA" }],
  },
  {
    slug: "table-tennis",
    domain: "vision",
    name: "Table Tennis Ball Tracking",
    tagline: "Predicting where the ball lands before it does",
    headline: { value: "95%", label: "bounce prediction accuracy" },
    stack: ["Computer vision", "CNN", "TensorFlow"],
    points: [
      "Ball tracking and trajectory prediction for the Helios training device at Hyperlab",
      "Combined laser detection with ball detection so athletes hit the right spot, 20% better shot accuracy in training",
    ],
    links: [],
  },
  {
    slug: "helios-timeout",
    domain: "ml",
    name: "Helios Adaptive Timeout",
    tagline: "Personalised rest timing for athletes",
    headline: { value: "-30%", label: "player fatigue" },
    stack: ["Machine learning", "Firebase"],
    points: [
      "Timeout mode on the Helios laser device, learned from historical training data",
      "Personalised timed prompts improved drill efficiency by 15%",
    ],
    links: [],
  },
  {
    slug: "sim-driving",
    domain: "vision",
    name: "Deep Learning Driving in Simulation",
    tagline: "Steering a virtual car with a custom CNN",
    headline: { value: "-20%", label: "prediction error" },
    stack: ["CNN", "Udacity simulator", "Keras"],
    points: [
      "Custom deep learning model predicting steering and throttle, compared against other architectures",
      "Presented at ICORT 2023, organised by DRDO India",
    ],
    links: [],
  },
  {
    slug: "pcm-battery",
    domain: "ml",
    name: "PCM Battery Thermal Management",
    tagline: "Keeping EV battery packs cool with data",
    headline: { value: "-12%", label: "thermal issues" },
    stack: ["Predictive modelling", "BMS", "Li-ion"],
    points: [
      "Helped build a Li-ion pack and BMS with a composite phase change material cooling system",
      "Built the dataset and predictive models to improve thermal performance on a 3.5kW load bank",
    ],
    links: [],
  },
  {
    slug: "maternity-ecommerce",
    domain: "ml",
    name: "Maternity eCommerce Pricing",
    tagline: "What makes a product popular",
    headline: { value: "Click → Rank", label: "popularity metric" },
    stack: ["Random Forest", "SQL", "Data viz"],
    points: [
      "Analysed online maternity clothing data and built a click-based popularity metric",
      "Showed first-page placement drives popularity more than most product features",
    ],
    links: [],
  },
];
