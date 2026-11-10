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
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4096.546839279105!2d7.057758310743839!3d8.829087291188033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e8a458c737ff9%3A0x8547b10178d75a9c!2sHoliness%20Camp%20Ground%2C%20Kwali%20Abuja!5e1!3m2!1sen!2sng!4v1794127232959!5m2!1sen!2sng",
  },
  contact: {
    phone: "+234 701 566 8452",
    phoneTel: "tel:+2347015668452",
    whatsAppUrl: "https://wa.me/2347015668452",
    email: null, // Dynamic: null until configured, never hardcode fake email
  },
  socials: {
    youtube: "https://www.youtube.com/",
    facebook: "https://www.facebook.com/pastorpaulrika",
  },
  logo: {
    src: "/images/horemow_logo.png",
    alt: "Holiness Revival Movement Worldwide (Horemow) Logo",
    width: 140,
    height: 48,
  },
  copyright: "Copyright © 2026 Holiness Revival Movement Worldwide (Horemow). All Rights Reserved.",
  refCodePrefix: "HGC-",
  refCodeAlphabet: "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", // Unambiguous alphabet: no 0, O, 1, I
  ministersInitial: [
    {
      id: "paul-rika",
      name: "Pastor Paul Rika",
      role: "INTERNATIONAL DIRECTOR / FOUNDER",
      bio: "Pastor Paul Rika is the founder and International Director of the Holiness Revival Movement Worldwide (HOREMOW), established to revive biblical righteousness, complete sanctification, and prepare believers globally for the rapture and second coming of Jesus Christ.",
      image: "/images/pst_paul_rika_1.jpg",
    },
    {
      id: "linda-paul-rika",
      name: "Evang. Linda Paul Rika",
      role: "CONFERENCE SPEAKER",
      bio: "Evangelist Linda Paul Rika ministers alongside Pastor Paul Rika across international conferences and revival meetings, sharing messages of deep inward and outward holiness, prayer, and restitution.",
      image: "/images/linda_paul_rika.jpg",
    },
  ],
  about: {
    origins: "Founded in 2009 by Pastor Paul Rika and formally inaugurated in 2010 in Kwali, Abuja, Nigeria.",
    nature: "Not structured as a separate church denomination, but as an end-time spiritual movement operating across and within existing Christian churches to bring believers together under a shared biblical umbrella.",
    mission: "To revive biblical righteousness, holiness (inward and outward), complete sanctification, and restitution among Christians, preparing believers for the rapture and the second coming of Jesus Christ.",
    authority: "The 66 books of the Holy Bible as the absolute, inspired, and final working manual for faith and conduct.",
    globalReach: "Spanning Nigeria and international chapters across Uganda, Kenya, Rwanda, Malawi, Zambia, Liberia, North America, and beyond.",
  },
} as const;
