export const sectionAnchors = [
  "#welcome",
  "#couple",
  "#story",
  "#details",
  "#schedule",
  "#puzzle",
  "#rsvp",
] as const;

export type SectionAnchor = (typeof sectionAnchors)[number];
