<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Brand

The UI language is approved and documented in docs/BRAND.md (live reference: /docs/brand/system). Read it before touching any screen. Work order and status are in docs/ROADMAP.md (steps 10 and 11). Record every new owner approval in BRAND.md's decision log.

# Browser & resource rules
- Only launch a browser when you actually need to verify UI. Prefer unit tests,
  type checks, and curl/HTTP checks first.
- Always run browsers headless, and ALWAYS close the browser (browser.close())
  when a check is done. Never leave a browser process running between steps.
- Reuse a single browser/page per session instead of launching a new one for
  each check.
- Use a small viewport (1280x800) and take screenshots only when needed.
- Disable animations in tests (reducedMotion: 'reduce').
- Run Playwright with --workers=1 unless I ask otherwise.
- Never start tests in watch mode (use `vitest run`, not `vitest`).
- Before starting a dev server, check if one is already running. Don't start
  duplicates. Stop servers you started when the task is finished.
- At the end of a task, check for leftover chrome/node processes you spawned
  and kill them.
- Every browser you launch is muted (`--mute-audio`; scripts/shoot.mjs does this).
- scripts/shoot.mjs reuses one shared headless Chrome (a tab per run, closed after; the browser
  quits itself after 3 idle minutes). Run `node scripts/shoot.mjs --close` when you finish a task.
