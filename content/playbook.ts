// How I work with AI. Things I actually tell teams at work.
export const playbookIntro =
  "I write most of my code with Claude Code and Cursor now, and I push for AI-assisted development at work. Not because it's trendy. A team that uses these tools well ships faster and spends a lot less. These are the things I end up repeating.";

export const playbook = [
  {
    compound: "soft",
    title: "Give it the map before the job",
    body: "A short CLAUDE.md or rules file with how the repo is laid out, how to run tests, and what not to touch saves more tokens than any prompt trick. The model stops exploring and starts working.",
  },
  {
    compound: "soft",
    title: "Plan first, then let it drive",
    body: "Ask for a plan, fix the plan, then say go. Correcting a plan costs a few hundred tokens. Correcting a wrong implementation costs a whole context window.",
  },
  {
    compound: "medium",
    title: "Pick the model per lap",
    body: "The biggest model for architecture and nasty bugs, a fast cheap one for renames, tests and boilerplate. A lot of AI spend is the expensive model doing easy work.",
  },
  {
    compound: "medium",
    title: "Cache what doesn't change",
    body: "System prompts, tool definitions and big reference docs go first and get cached. Put the part that changes at the end. On repeat calls that's most of the bill gone.",
  },
  {
    compound: "hard",
    title: "Tools over paste",
    body: "Don't paste a 4,000 line log into chat. Give the agent an MCP server or a script that can grep it. It reads the 20 lines that matter and you keep your context.",
  },
  {
    compound: "hard",
    title: "Clear the context, keep the notes",
    body: "Long sessions get dumb. When a task is done, have it write a short handoff, clear, and start fresh from the note. Cheaper and the answers get sharper.",
  },
  {
    compound: "inter",
    title: "Let it check its own work",
    body: "Tests, a linter, a type check, a screenshot. If the agent can run something that tells it it's wrong, it fixes itself. If it can't, you become the test suite.",
  },
  {
    compound: "inter",
    title: "Review like it's a junior's PR",
    body: "Fast is good. Merged without reading is how you get a 2am page. I read every diff. The speedup is still huge.",
  },
] as const;
