export const SITE_CONFIG = {
  name: "IHGC 2026",
  ministry: "Holiness Revival Movement Worldwide (Horemow)",
  shortBrandName: "Horemow",
  eventTitle: "International Holiness General Conference 2026",
  theme: "Man and Satan in Contention Against the Holy God",
  datesText: "Tuesday 8 December to Friday 11 December 2026",
  startsAt: "2026-12-08T16:00:00+01:00", // WAT UTC+1
  endsAt: "2026-12-11T23:59:59+01:00",
  venue: {
    name: "Holiness Campground",
    landmark: "Behind FGC",
    location: "Kwali, Abuja, Nigeria",
    mapPinUrl: null, // Placeholder logged in CONTENT_REQUESTS.md
  },
  contact: {
    phone: "+234 701 566 8452",
    phoneTel: "tel:+2347015668452",
    whatsAppUrl: "https://wa.me/2347015668452",
    email: null, // Dynamic: null until configured, never hardcode fake email
  },
  copyright: "Copyright © 2026 Holiness Revival Movement Worldwide (Horemow). All Rights Reserved.",
  refCodePrefix: "HGC-",
  refCodeAlphabet: "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", // Unambiguous alphabet: no 0, O, 1, I
  ministersInitial: [
    {
      id: "paul-rika",
      name: "Pastor Paul Rika",
      role: "CONFERENCE SPEAKER / FOUNDER",
      bioPlaceholder: "Biography pending official verification.",
      imagePlaceholder: "PHOTO NEEDED: Pastor Paul Rika portrait (min 800x800)",
    },
    {
      id: "linda-paul-rika",
      name: "Evang. Linda Paul Rika",
      role: "CONFERENCE SPEAKER",
      bioPlaceholder: "Biography pending official verification.",
      imagePlaceholder: "PHOTO NEEDED: Evang. Linda Paul Rika portrait (min 800x800)",
    },
  ],
} as const;
