import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

export function WhyAttend() {
  const points = [
    {
      title: "Reviving Biblical Righteousness",
      description:
        "Deep, uncompromised exposition of scripture on inward and outward holiness, complete sanctification, and Christian perfection.",
    },
    {
      title: "Preparing for the Rapture",
      description:
        "Clear end-time prophetic insights to align your personal walk and family life with the holy demands of God before the trumpet sounds.",
    },
    {
      title: "Deliverance, Healing & Restitution",
      description:
        "Practical spiritual guidance and prayer ministry to walk in freedom, make biblically sound restitution, and receive divine restoration.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Heading, Subtitle, Bullet list, Mint Pill Button */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#111320] leading-[1.15] tracking-tight">
              Why Attend This Conference?
            </h2>
            
            <p className="text-base text-[#6B7280] leading-relaxed">
              This four-day holy convocation at the Holiness Campground in Kwali, Abuja brings together believers, ministers, and seekers from across the world under the direct ministry of the Holy Spirit.
            </p>

            {/* Bullet items with mint arrow-chevrons */}
            <div className="space-y-5 pt-2">
              {points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#EAF9F7] flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#0E1020]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#111320]">
                      {pt.title}
                    </h3>
                    <p className="text-sm text-[#6B7280] leading-relaxed mt-1">
                      {pt.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filled mint pill button */}
            <div className="pt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all duration-200 active:scale-95"
              >
                Register For Conference
              </Link>
            </div>
          </div>

          {/* Right Column: Layered Collage with Chamfered Corner & Mint Frame */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            {/* Mint outline frame background */}
            <div className="absolute -top-4 -right-4 w-72 h-80 sm:w-96 sm:h-[420px] rounded-[32px] border-2 border-[#8EE3D6]/40 -z-0" />

            <div className="relative z-10 grid grid-cols-12 gap-4 w-full max-w-[500px]">
              {/* Primary Main Image (Front Left) */}
              <div className="col-span-8 relative aspect-[4/5] rounded-[24px] overflow-hidden shadow-xl">
                <Image
                  src="/images/crowd-bw_2.jpg"
                  alt="Believers gathered in worship at Horemow Conference"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Secondary Layered Image (Top-Right with Chamfered Corner) */}
              <div className="col-span-7 -ml-16 mt-16 sm:mt-24 relative aspect-square rounded-[20px] overflow-hidden shadow-2xl clip-chamfer-tr">
                <Image
                  src="/images/crowd-bw_3.jpg"
                  alt="Conference prayer session"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

