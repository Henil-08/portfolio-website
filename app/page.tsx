import Experience from "@/components/Experience";
import { profile, story } from "@/content/profile";
import { experience } from "@/content/experience";
import { projects } from "@/content/projects";

export default function Home() {
  return (
    <>
      <Experience />
      {/* Plain text for search engines and screen readers. The world itself is canvas. */}
      <div className="sr-only">
        <h1>
          {profile.name}, {profile.role} at {profile.company}
        </h1>
        <p>{profile.oneLiner}</p>
        {story.map((s) => (
          <section key={s.lap}>
            <h2>{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 16)}>{p}</p>
            ))}
          </section>
        ))}
        <h2>Experience</h2>
        <ul>
          {experience.map((r) => (
            <li key={r.company + r.title}>
              {r.title}, {r.company}, {r.dates}
            </li>
          ))}
        </ul>
        <h2>Projects</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.slug}>
              {p.name}: {p.tagline}
            </li>
          ))}
        </ul>
        <a href="/resume">Resume</a> <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </div>
    </>
  );
}
