export type Role = {
  company: string;
  title: string;
  dates: string;
  kind: "Full time" | "Internship" | "Founding team" | "Research" | "Team lead";
  tags: string[];
  points: string[];
};

export const experience: Role[] = [
  {
    company: "Waters Corporation",
    title: "AI / ML Engineer",
    dates: "Jan 2026 – Present",
    kind: "Full time",
    tags: ["LangGraph", "Claude", "MCP", "SAP", "SQL"],
    points: [
      "Built an agentic framework for the company-wide S/4HANA migration, cutting SQL updates and validation from 50h to 11h inside a 96h window",
      "Developed an agentic customer onboarding workflow (LangGraph, Claude) on custom SAP MCPs, saving 5+ days per customer, 500+ days a year",
      "Designed a parallel sub-agent architecture with self-healing retries across 50+ SQL workflows",
      "Deployed MCP servers that let business users safely edit database entries, replacing engineering ticket queues during the website migration",
      "Optimized SQL pipelines over 20M+ B2B records for real-time validation dashboards, and mentored 3+ ML/AI interns",
    ],
  },
  {
    company: "Waters Corporation",
    title: "GenAI and ML Intern",
    dates: "Jun 2025 – Aug 2025",
    kind: "Internship",
    tags: ["RAGAS", "AWS Bedrock", "OpenSearch", "Streamlit"],
    points: [
      "Built the LLM evaluation framework for an AI search engine, automating RAGAS and LLM-as-a-judge testing",
      "Generated 2K+ synthetic test samples with Claude Sonnet 4 on Bedrock across 3 query types, cutting SME review time by 50%",
      "Integrated OpenSearch + S3 retrieval over 400K+ chunks, scaling resources 2.5x across teams",
      "Shipped a WebSocket Streamlit dashboard so SMEs could track metrics and steer improvements",
      "Closed 24 story points in one sprint and demoed live to 200+ employees across the US and India",
    ],
  },
  {
    company: "Edlight, PBC",
    title: "Machine Learning Intern",
    dates: "Sep 2024 – Dec 2024",
    kind: "Internship",
    tags: ["LangGraph", "FastAPI", "AWS Lambda", "ChromaDB", "Qwen2-VL"],
    points: [
      "Delivered a multi-agent chatbot with guardrails on LangGraph and FastAPI, streaming from AWS Lambda",
      "Hit 180ms p95 TTFT with dynamic routing: SQL for curriculum, RAG for resources, direct answers for the rest",
      "Improved ChromaDB retrieval with CRAG and a reranker: faithfulness +13.4%, hallucinations -32.5%",
      "Cut multimodal API latency by 80% at 30K+ monthly requests with queuing and threading",
      "Built an image-to-IEP-goals matcher on Qwen2-VL-7B that won a week-long hackathon and became the biggest release of Q1 2025",
    ],
  },
  {
    company: "Impacter AI",
    title: "AI Developer Intern",
    dates: "Sep 2024 – Dec 2024",
    kind: "Internship",
    tags: ["Azure OpenAI", "CrewAI", "MCP", "AKS"],
    points: [
      "Built SalesPal, a real-estate sales agent on Azure OpenAI, CosmosDB and Databricks for personalized pitching",
      "Wired CrewAI email and call agents (SendGrid, Twilio, MCP) for contextual outreach to 1K+ concurrent users",
      "Containerized it with Docker and deployed on Azure Kubernetes Service with CI/CD",
    ],
  },
  {
    company: "Hyperlab Sportech",
    title: "Founding ML Engineer",
    dates: "Jan 2022 – Aug 2023",
    kind: "Founding team",
    tags: ["Swift", "LangChain", "AWS", "Spark", "Ray"],
    points: [
      "Launched an ML-driven iOS app with 50K+ downloads and 20K+ DAU, and raised $100K through Shark Tank India and angels",
      "Built a multimodal AI coach (LangChain, GPT-4, Llama 3, AstraDB) with FastAPI inference",
      "Built a vector store from 30K+ files with semantic chunking and fine-tuned Llama 3, cutting hallucinations by 60%",
      "Wrote ETL on AWS Glue, Spark and Kinesis over 10TB+ of athlete performance data",
      "Trained a CNN table tennis ball predictor on SageMaker and ran multi-GPU LSTM training with Ray on 4 GPUs",
    ],
  },
  {
    company: "Nirma University",
    title: "Student Researcher",
    dates: "Jan 2022 – May 2022",
    kind: "Research",
    tags: ["Random Forest", "Clustering"],
    points: [
      "Curated a 150K-row Li-ion battery pack dataset across 1,300 charge cycles",
      "Predicted optimal charging temperature with Random Forest regression, improving battery health by 12%",
    ],
  },
  {
    company: "Team Stallions",
    title: "Captain",
    dates: "Jan 2021 – Dec 2021",
    kind: "Team lead",
    tags: ["Leadership", "Computer Vision", "Embedded"],
    points: [
      "Led 40 students building Mercury, a solar EV with 150km range and 60kmph top speed",
      "Won Asia's largest electric solar vehicle competition by 500+ points, taking 8 of 11 trophies",
      "Engineered the patented steering system behind our Best Autonomous Round award",
    ],
  },
];

export const education = [
  {
    school: "Northeastern University",
    degree: "MS, Data Science",
    detail: "4.0 GPA · Dec 2025 · Boston",
  },
  {
    school: "Nirma University",
    degree: "B.Tech, Electronics and Communication",
    detail: "Ahmedabad, India",
  },
];
