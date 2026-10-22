export const profile = {
  name: "Henil Gajjar",
  short: "Henil",
  role: "AI / ML Engineer",
  company: "Waters Corporation",
  location: "Boston, MA",
  coords: "42.3555° N, 71.0565° W",
  email: "henil.gajjar2102@gmail.com",
  resume:
    "https://drive.google.com/file/d/1VfI0pMkejigWso1PqJZSfTkGSP4T95FB/view?usp=sharing",
  links: {
    github: "https://github.com/Henil-08",
    linkedin: "https://www.linkedin.com/in/henilgajjar",
    scholar: "https://scholar.google.com/citations?user=RdSGiWYAAAAJ&hl=en",
    huggingface: "https://huggingface.co/henil08",
    medium: "https://medium.com/@henilgajjar08",
  },
  oneLiner:
    "I build AI that works in the real world. These days that mostly means giving models the context and tools they need to actually be useful.",
};

export const stats = [
  { value: "4+", label: "years in industry" },
  { value: "3+", label: "years with LLMs, agents, RAG" },
  { value: "7", label: "papers in MLSys, IEEE, Elsevier" },
  { value: "45+", label: "citations" },
  { value: "2", label: "patents" },
];

export const story = [
  {
    lap: 1,
    place: "Ahmedabad",
    years: "2021",
    title: "A solar car and a pile of traffic cones",
    body: [
      "I've been writing code since I was 18, but ML found me by accident. I was studying Electronics and Communication at Nirma University and captaining Team Stallions, 40 students building Mercury, a solar electric car, for Asia's biggest solar vehicle competition.",
      "One round needed the car to drive itself. So I learned computer vision on the fly, trained a model to tell two kinds of cones apart, and got it steering at 24 FPS on a Jetson Nano. We won 8 of 11 trophies, including Best Autonomous Round, and the steering system we built got patented. Watching something I trained move a real car is the moment I got hooked.",
    ],
  },
  {
    lap: 2,
    place: "Hyperlab",
    years: "2022 to 2023",
    title: "Founding engineer, then Shark Tank",
    body: [
      "Right after that I joined Hyperlab as the founding ML engineer. We built a sports analytics app for athletes, took it to Shark Tank India, and walked out with funding. It's still one of the proudest moments of my life.",
      "The spotlight was nice, but the real lesson was shipping. 50K downloads, 20K people opening it every day, and never enough compute. I learned to build fast, make tradeoffs I could defend, and sit in on sales calls when it mattered.",
    ],
  },
  {
    lap: 3,
    place: "Boston",
    years: "2023 to 2025",
    title: "Moved countries, then GenAI happened",
    body: [
      "I moved to Boston for an MS in Data Science at Northeastern and finished with a 4.0. Right around the time I landed, the GenAI wave hit, and I went all in on agents, RAG, fine-tuning and the boring production parts that make them hold up.",
      "Three co-ops gave me reps. At Edlight I shipped a multi-agent chatbot with a 180ms TTFT and helped win the hackathon that became their biggest release of the quarter. At Impacter AI I built sales agents on Kubernetes. At Waters I built the evaluation system for their AI search engine.",
    ],
  },
  {
    lap: 4,
    place: "Waters",
    years: "2026 to now",
    title: "Making AI useful inside a big company",
    body: [
      "Waters brought me back full time in January 2026. I build agents that do real work there: an agentic framework for our S/4HANA migration that took SQL validation from 50 hours to 11, an onboarding workflow on custom SAP MCP servers that saves about five days per customer, and tools that let business users fix data without filing a ticket.",
      "Most of what I do comes down to one idea. A model is only as good as the context and tools you give it. I also spend a lot of time getting teams to use Claude Code and Cursor well, so they ship more and spend less on tokens.",
    ],
  },
] as const;

export const offTrack = [
  {
    key: "f1",
    title: "Formula 1",
    body: "Sunday mornings are for race starts. I love the strategy side as much as the driving: tyre calls, undercuts, a team reacting to data in real time. It's basically ML ops at 300 km/h.",
  },
  {
    key: "cricket",
    title: "Cricket",
    body: "Grew up with it. I once fine-tuned Gemma 2 to pick my IPL fantasy team, which tells you how seriously I take it.",
  },
  {
    key: "football",
    title: "Football",
    body: "Weekends, late nights, whatever league is on. Also the reason I'm good at reading formations off a screen.",
  },
  {
    key: "gadgets",
    title: "New tech",
    body: "Launch events are my Super Bowl. New phones, chips, headsets, I want to know what's inside and what it lets people do that they couldn't before.",
  },
];
