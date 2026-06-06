import type { WeddingContent } from "../content/types";
import { CountdownSection } from "./CountdownSection";
import { CoupleSection } from "./CoupleSection";
import { DetailsSection } from "./DetailsSection";
import { HeroSection } from "./HeroSection";
import { PuzzleSection } from "./PuzzleSection";
import { RsvpSection } from "./RsvpSection";
import { ScheduleSection } from "./ScheduleSection";
import { StorySection } from "./StorySection";
import { WelcomeSection } from "./WelcomeSection";
import { SectionDivider } from "./presentational/SectionDivider";

type InvitationSectionsProps = {
  content: WeddingContent;
};

export function InvitationSections({ content }: InvitationSectionsProps) {
  return (
    <>
      <HeroSection hero={content.hero} />
      <WelcomeSection welcome={content.welcome} />
      <CountdownSection countdown={content.countdown} />
      <SectionDivider variant={0} />
      <CoupleSection couple={content.couple} />
      <SectionDivider variant={1} />
      <StorySection story={content.story} />
      <SectionDivider variant={2} />
      <DetailsSection venue={content.venue} />
      <SectionDivider variant={3} />
      <ScheduleSection schedule={content.schedule} />
      <SectionDivider variant={4} />
      <RsvpSection rsvp={content.rsvp} />
      {content.puzzle ? (
        <>
          <SectionDivider variant={5} />
          <PuzzleSection puzzle={content.puzzle} />
        </>
      ) : null}
    </>
  );
}
