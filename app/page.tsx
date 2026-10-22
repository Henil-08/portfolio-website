import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import Story from "@/components/home/Story";
import TimingTower from "@/components/home/TimingTower";
import Garage from "@/components/home/Garage";
import Playbook from "@/components/home/Playbook";
import SideQuest from "@/components/home/SideQuest";
import Research from "@/components/home/Research";
import OffTrack from "@/components/home/OffTrack";
import Contact from "@/components/home/Contact";
import TeamRadio from "@/components/radio/TeamRadio";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <div className="kerb" />
        <Story />
        <TimingTower />
        <Garage />
        <Playbook />
        <SideQuest />
        <Research />
        <OffTrack />
        <Contact />
      </main>
      <TeamRadio />
    </>
  );
}
