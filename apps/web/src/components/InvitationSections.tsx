import type { WeddingContent } from "../content/types";
import { CoupleSection } from "./CoupleSection";
import { DetailsSection } from "./DetailsSection";
import { HeroSection } from "./HeroSection";
import { RsvpSection } from "./RsvpSection";
import { ScheduleSection } from "./ScheduleSection";
import { StorySection } from "./StorySection";
import { WelcomeSection } from "./WelcomeSection";

type InvitationSectionsProps = {
  content: WeddingContent;
};

export function InvitationSections({ content }: InvitationSectionsProps) {
  return (
    <>
      <HeroSection hero={content.hero} />
      <WelcomeSection welcome={content.welcome} />
      <CoupleSection couple={content.couple} />
      <StorySection story={content.story} />
      <DetailsSection venue={content.venue} travel={content.travel} />
      <ScheduleSection schedule={content.schedule} />
      <RsvpSection rsvp={content.rsvp} />
    </>
  );
}
