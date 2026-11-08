import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";
import { BookOpen, Globe2, ShieldCheck, HeartHandshake } from "lucide-react";

export const metadata = {
  title: "About Horemow",
  description: "Learn about the origins, mission, and worldwide outreach of the Holiness Revival Movement Worldwide.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Page Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 relative z-10 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            About The Movement
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Holiness Revival Movement Worldwide
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-base sm:text-lg">
            Reviving biblical righteousness and preparing the global bride of Christ for the rapture.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-16">
          
          {/* Section 1: Overview & Origins */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111320]">
                Overview and Origins
              </h2>
              <p className="text-base text-[#6B7280] leading-relaxed">
                <strong>HOREMOW</strong> stands for the <em>Holiness Revival Movement Worldwide</em>, a non-denominational Christian ministry founded in Nigeria. The movement was birthed in 2009 by Pastor Paul Rika, who serves as the International Director, and was formally inaugurated in 2010 in Kwali, Abuja, Nigeria.
              </p>
              <p className="text-base text-[#6B7280] leading-relaxed">
                HOREMOW is not structured as a separate church denomination. Rather, it operates as an end-time spiritual movement working across and within existing Christian denominations to gather believers together under a shared spiritual umbrella of biblical truth and holiness.
              </p>
            </div>
            <div className="md:col-span-5 relative aspect-[4/5] rounded-[20px] overflow-hidden shadow-lg bg-gray-100">
              <Image
                src="/images/pst_paul_rika_2.jpg"
                alt="Pastor Paul Rika ministering"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Section 2: Core Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
            <div className="bg-[#F8FAFC] rounded-[20px] p-8 border border-gray-100 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111320]">Core Mission</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                To revive biblical righteousness, holiness (both inward in heart and outward in conduct and appearance), complete sanctification, and genuine restitution among Christians to prepare believers for the rapture and the second coming of Jesus Christ.
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-[20px] p-8 border border-gray-100 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111320]">Guiding Authority</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                The movement treats the 66 inspired books of the Holy Bible as its absolute and final working manual for faith, church order, doctrine, and everyday living.
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-[20px] p-8 border border-gray-100 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111320]">Literature & Media Outreach</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                HOREMOW actively promotes evangelism through the publishing and worldwide distribution of holiness books, audio messages, and multilingual literature authored by Pastor Paul Rika.
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-[20px] p-8 border border-gray-100 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#111320]">International Expansion</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Beyond its headquarters in Nigeria, HOREMOW has established chapters and regional fellowships across Africa (Uganda, Kenya, Rwanda, Malawi, Zambia, Liberia), North America, Europe, and Asia.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-[#0E1020] rounded-[24px] p-8 sm:p-12 text-center text-white space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold">
              Join Us At The 2026 International Conference
            </h3>
            <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
              Experience the power of God&apos;s holy word firsthand at Holiness Campground, Kwali, Abuja from December 8 to 11, 2026.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide hover:bg-[#7BD4C7] transition-all shadow-md"
            >
              Register Now (₦5,000 / $20)
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
