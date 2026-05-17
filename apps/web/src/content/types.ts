export type NavigationItem = {
  label: string;
  href: string;
  featured?: boolean;
};

export type HeroAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type WeddingContent = {
  metadata: {
    title: string;
    description: string;
  };
  navigation: NavigationItem[];
  hero: {
    eyebrow: string;
    title: string;
    dateLine: string;
    message: string;
    image: {
      src: string;
      alt: string;
    };
    actions: HeroAction[];
  };
  welcome: {
    eyebrow: string;
    title: string;
    body: string[];
  };
  story: {
    eyebrow: string;
    title: string;
    milestones: Array<{
      year: string;
      title: string;
      body: string;
    }>;
  };
  venue: {
    eyebrow: string;
    title: string;
    name: string;
    address: string;
    mapUrl: string;
    notes: string[];
  };
  travel: {
    eyebrow: string;
    title: string;
    items: Array<{
      title: string;
      body: string;
    }>;
  };
  schedule: {
    eyebrow: string;
    title: string;
    events: Array<{
      time: string;
      title: string;
      body: string;
    }>;
  };
  rsvp: {
    eyebrow: string;
    title: string;
    body: string;
    submitLabel: string;
    fields: Array<{
      name: string;
      label: string;
      type: "text" | "email" | "tel" | "number" | "textarea" | "select";
      placeholder?: string;
      options?: string[];
    }>;
  };
};
