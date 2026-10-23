# henil.dev

My portfolio. It opens with a terminal where Claude tells you who I am, then turns into an F1 pit wall: my story told in laps, work history on a timing tower, and a 3D car you can drive around a circuit where each corner is a chapter.

- `/` the pit wall: terminal intro, story, work, projects, AI playbook, side quest, research, contact
- `/drive` a playable 3D circuit (React Three Fiber)
- `/resume` one page, no animations, prints well
- `/api/radio` streaming answers about me from Groq, as Claude in the terminal or as my race engineer on team radio
- `/mcp` an MCP server. `claude mcp add --transport http henil https://<site>/mcp`

## Run it

```bash
npm install
cp .env.example .env.local   # add a GROQ_API_KEY for live answers
npm run dev
```

All content lives in `content/`. Edit those files and the page, the resume, the radio and the MCP server all update together.

## Stack

Next.js 16, React 19, Tailwind 4, React Three Fiber, Framer Motion, Groq. Deployed as a Docker container behind Caddy on Oracle Cloud. See [deploy/DEPLOY.md](deploy/DEPLOY.md).

## Credits

The vehicle feel and follow camera are adapted from [Bruno Simon's folio-2025](https://github.com/brunosimon/folio-2025) (MIT, © 2025 Bruno Simon): suspension damping ratios, centre-of-mass setup, soft top speed and the single-pass camera smoothing.

Music, sound effects and the race engineer's voice are generated with [ElevenLabs](https://elevenlabs.io) (`scripts/gen-audio.mjs`).
