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
      <SectionDivider />
      <WelcomeSection welcome={content.welcome} />
      <SectionDivider />
      <CoupleSection couple={content.couple} />
      <SectionDivider />
      <StorySection story={content.story} />
      <SectionDivider />
      <DetailsSection venue={content.venue} />
      <SectionDivider />
      <ScheduleSection schedule={content.schedule} />
      <SectionDivider />
      <RsvpSection rsvp={content.rsvp} />
    </>
  );
}
