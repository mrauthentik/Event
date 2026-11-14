import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { BookOpen, Globe2, Heart, Users, MapPin } from "lucide-react";

export const metadata = {
  title: "About HOREMOW | Holiness Revival Movement Worldwide",
  description: "Learn about the Holiness Revival Movement Worldwide (HOREMOW), founded by Pastor Paul Rika, its biblical mission, global presence, and the International Holiness General Conference.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-[#0E1020] text-white py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/crowd-bw_2.jpg"
            alt="HOREMOW worshippers gathered"
            fill
            className="object-cover opacity-15"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E1020]/90 via-[#0E1020]/80 to-[#0E1020]" />
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 sm:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            About the Ministry
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Holiness Revival Movement Worldwide
          </h1>
          <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            A non-denominational Christian movement dedicated to reviving biblical righteousness, inward and outward holiness, and preparing believers across all churches for the rapture.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 space-y-20">

          {/* Section 1: Overview and Origins */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF9F7] text-[#0E7A6E] text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>Overview & Origins</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#111320] leading-tight tracking-tight">
                An End-Time Movement Across the Body of Christ
              </h2>
              <div className="space-y-4 text-base text-[#4B5563] leading-relaxed">
                <p>
                  <strong>HOREMOW</strong> stands for the <strong>Holiness Revival Movement Worldwide</strong>, a non-denominational Christian ministry founded in 2009 by <strong>Pastor Paul Rika</strong>, who serves as the International Director. The movement was formally inaugurated in 2010 in Kwali, Abuja, Nigeria.
                </p>
                <p>
                  HOREMOW is not structured as a separate church denomination. Rather, it operates as an end-time movement operating across and within existing Christian churches to bring believers together under a shared spiritual umbrella of biblical truth and sanctification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">Founded</span>
                  <p className="text-base font-bold text-[#111320] mt-0.5">2009 · Pastor Paul Rika</p>
                  <p className="text-xs text-gray-500">International Director</p>
                </div>
                <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">Inauguration</span>
                  <p className="text-base font-bold text-[#111320] mt-0.5">2010 · Kwali, Abuja</p>
                  <p className="text-xs text-gray-500">Holiness Campground</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden shadow-2xl border-4 border-white bg-gray-100">
                <Image
                  src="/images/pst_paul_rika_1.jpg"
                  alt="Pastor Paul Rika, Founder and International Director of HOREMOW"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 500px"
                />
              </div>
              <div className="mt-3 text-center text-xs text-gray-500 italic">
                Pastor Paul Rika, International Director & Founder
              </div>
            </div>
          </section>

          {/* Section 2: Core Mission & Guiding Authority */}
          <section className="rounded-[24px] bg-[#0E1020] text-white p-8 sm:p-14 relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
                  Our Calling & Authority
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Core Mission & Guiding Authority
                </h2>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                  The stated purpose of the Holiness Revival Movement Worldwide is to revive biblical righteousness, holiness (both inward and outward), complete sanctification, and restitution among Christians, preparing believers for the rapture and the second coming of Jesus Christ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-[#171A2B] border border-white/10 rounded-[18px] p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#8EE3D6]/20 text-[#8EE3D6] flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Absolute Biblical Authority</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    The movement treats the <strong>66 books of the Holy Bible</strong> as its absolute and final working manual for faith, conduct, doctrine, and salvation.
                  </p>
                </div>

                <div className="bg-[#171A2B] border border-white/10 rounded-[18px] p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#8EE3D6]/20 text-[#8EE3D6] flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Inward & Outward Holiness</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Emphasizing genuine repentance, practical restitution, heart purity, modest Christian living, and urgent rapture readiness for every soul.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Activities and Global Presence */}
          <section className="space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                Ministries & Reach
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#111320] tracking-tight">
                Activities and Global Presence
              </h2>
              <p className="text-base text-gray-600">
                Impacting millions across nations, languages, and denominations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[20px] bg-[#F8FAFC] border border-gray-100 space-y-4">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">Revivals & Conferences</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  HOREMOW organizes revival meetings, international crusades, leadership conferences, ministers&apos; conferences, and Bible training colleges across the globe.
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-[#F8FAFC] border border-gray-100 space-y-4">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">Literature & Multilingual Media</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Heavily promotes evangelism through the distribution of holiness books, sermons, tracts, and multilingual audio/video resources authored by Pastor Paul Rika.
                </p>
              </div>

              <div className="p-6 rounded-[20px] bg-[#F8FAFC] border border-gray-100 space-y-4">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <Globe2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">International Chapters</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Beyond Nigeria, HOREMOW has established chapters across Africa (including Uganda, Kenya, Rwanda, Malawi, Zambia, Liberia), North America, Europe, and Asia.
                </p>
              </div>
            </div>

            {/* Collage Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden shadow-md">
                <Image
                  src="/images/about_us_1.jpg"
                  alt="HOREMOW congregation and leaders"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden shadow-md">
                <Image
                  src="/images/about_us_2.jpg"
                  alt="HOREMOW ministers in fellowship"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden shadow-md">
                <Image
                  src="/images/about_us_3.jpg"
                  alt="HOREMOW worshippers"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Venue & Interactive Map */}
          <section className="rounded-[24px] border border-gray-200 bg-[#F8FAFC] p-8 sm:p-12 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                <MapPin className="w-4 h-4" />
                <span>Headquarters & Campground</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111320]">
                Holiness Campground, Kwali, Abuja
              </h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
                The international headquarters and campground of the Holiness Revival Movement Worldwide, located behind Federal Government College (FGC), Kwali, Federal Capital Territory, Abuja, Nigeria.
              </p>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-gray-200 shadow-sm bg-white">
              <div className="aspect-[16/9] w-full min-h-[360px] sm:min-h-[420px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4096.546839279105!2d7.057758310743839!3d8.829087291188033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e8a458c737ff9%3A0x8547b10178d75a9c!2sHoliness%20Camp%20Ground%2C%20Kwali%20Abuja!5e1!3m2!1sen!2sng!4v1794127232959!5m2!1sen!2sng"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Google Maps Location - Holiness Campground, Kwali, Abuja"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Landmark:</span> Behind FGC, Kwali, along the Abuja-Lokoja Expressway.
              </div>
              <Link
                href="/camp-info"
                className="text-xs font-bold text-[#0E7A6E] hover:underline inline-flex items-center gap-1"
              >
                <span>View Camp Info & Travel Advisory</span>
                <span>→</span>
              </Link>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="text-center space-y-6 pt-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111320]">
              Join Us at IHGC 2026
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-sm">
              Experience life-transforming biblical preaching, holy revival, and divine impartation at the Holiness Campground, Kwali, Abuja from 8 to 11 December 2026.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all"
              >
                Register for IHGC 2026
              </Link>
              <Link
                href="/conference"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-gray-300 text-[#111320] font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Conference Details
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
