export const sectionAnchors = [
  "#welcome",
  "#couple",
  "#story",
  "#details",
  "#schedule",
  "#rsvp",
] as const;

export type SectionAnchor = (typeof sectionAnchors)[number];
