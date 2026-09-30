import { HeroStory, type StoryStep } from "@/components/story/HeroStory";
import { ArchiveSection } from "@/components/story/ArchiveSection";
import { PipelineSection } from "@/components/story/PipelineSection";
import { MissionsSection } from "@/components/story/MissionsSection";
import { FinalCta } from "@/components/story/FinalCta";
import { datasetStats, experiments, findings } from "@/lib/data";
import { findingEvidence, passageCount, sourceExcerpt, type EvidenceRef } from "@/lib/evidence";
import { MISSIONS } from "@/lib/missions";
import { tidy } from "@/lib/text";

const present = (xs: (EvidenceRef | null)[]) => xs.filter((x): x is EvidenceRef => Boolean(x));

export default function Home() {
  const stats = datasetStats();

  // Landing science copy comes only from findings (badged while AI drafts) and cited NASA text.
  const steps: StoryStep[] = [
    {
      id: "earth",
      gravity: 1,
      gravityLabel: "Earth · 1 g",
      title: "On Earth, buoyancy shapes every flame.",
      body: "Hot gas rises and pulls fresh air in from below. That upward flow gives a candle its teardrop shape and keeps feeding it oxygen.",
      evidence: present([
        sourceExcerpt(
          "nasa-web-why-flames",
          "The typical shape of a candle flame is caused by less dense warm air rising to be replaced by cooler ambient air from below.",
        ),
      ]),
    },
    {
      id: "orbit",
      gravity: 0,
      gravityLabel: "Orbit · 0 g",
      title: "In orbit, a flame only gets the air you give it.",
      body: "Without buoyancy the flame turns spherical and lives on fan-driven air. BASS-II flames quenched when airflow fell to 1-5 cm/s, yet BRE flames kept burning in still, oxygen-rich air.",
      evidence: present([findingEvidence("f-bass-ii-01"), findingEvidence("f-acme-bre-01")]),
    },
    {
      id: "moon",
      gravity: 0.166,
      gravityLabel: "Moon · 0.17 g",
      title: "On the Moon, fire may find its worst case.",
      body: "Weak gravity supplies fresh air without cooling the flame much. Drop-tower tests found materials burning at lower oxygen in lunar and Martian gravity than in NASA's 1 g screening test.",
      evidence: present([findingEvidence("f-partial-g-01"), findingEvidence("f-luci-01", 1)]),
    },
  ];

  const archiveStats = [
    { value: stats.investigations, label: "Investigations", note: `${stats.flightInvestigations} flight, ${stats.groundInvestigations} ground` },
    { value: stats.findings, label: "Findings", note: `${stats.verifiedFindings} verified, ${stats.draftFindings} AI drafts` },
    { value: stats.sources, label: "NASA sources", note: "PSI records and NTRS reports" },
    { value: stats.testPoints, label: "Test points", note: "Normalised measurement rows" },
  ];

  const pipeline = [
    { title: "NASA sources", detail: `${stats.sources} PSI and NTRS records` },
    { title: "Extraction", detail: `${passageCount().toLocaleString("en-US")} cited passages` },
    { title: "Human verification", detail: `${stats.verifiedFindings} of ${stats.findings} findings verified so far` },
    { title: "Ranking", detail: "Transparent Insight Score per mission" },
    { title: "You", detail: "Mission Control, Risk Lens, Ask the Flame" },
  ];

  const missionCards = MISSIONS.map((m) => ({
    ...m,
    relevantFindings: findings.filter((f) => f.missionRelevance[m.id] >= 2).length,
  }));

  return (
    <>
      <HeroStory steps={steps} />
      <ArchiveSection
        acronyms={experiments.map((e) => tidy(e.acronym))}
        stats={archiveStats}
        span={`${stats.firstYear} to ${stats.lastYear}`}
      />
      <PipelineSection nodes={pipeline} />
      <MissionsSection missions={missionCards} />
      <FinalCta findings={stats.findings} sources={stats.sources} />
    </>
  );
}
