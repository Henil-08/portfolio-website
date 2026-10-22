import { projects } from "@/content/projects";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import ProjectCard from "./ProjectCard";

export default function Garage() {
  const main = projects.filter((p) => !p.sideQuest);
  const featured = main.filter((p) => p.featured);
  const rest = main.filter((p) => !p.featured);

  return (
    <Section
      id="projects"
      index="03"
      label="Projects"
      title="Things I've built"
      intro="Some for work, some for fun, one because I wanted a better fantasy cricket team."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {featured.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.08} className="flex [&>article]:w-full">
            <ProjectCard p={p} big />
          </Reveal>
        ))}
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <Reveal key={p.slug} delay={(i % 3) * 0.06} className="flex [&>article]:w-full">
            <ProjectCard p={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
