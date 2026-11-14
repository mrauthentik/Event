import type { MetadataRoute } from "next";

const publicPaths = ["", "/about", "/conference", "/programme", "/ministers", "/register", "/camp-info", "/faq", "/contact", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return publicPaths.map((path) => ({
    url: new URL(path, origin).toString(),
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
