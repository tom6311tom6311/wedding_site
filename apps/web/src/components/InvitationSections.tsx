import type { WeddingContent } from "../content/types";
import { CoupleSection } from "./CoupleSection";
import { DetailsSection } from "./DetailsSection";
import { HeroSection } from "./HeroSection";
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
      <CoupleSection couple={content.couple} />
      <SectionDivider variant={0} />
      <StorySection story={content.story} />
      <SectionDivider variant={1} />
      <DetailsSection venue={content.venue} />
      <SectionDivider variant={2} />
      <ScheduleSection schedule={content.schedule} />
      <SectionDivider variant={3} />
      <RsvpSection rsvp={content.rsvp} />
    </>
  );
}
