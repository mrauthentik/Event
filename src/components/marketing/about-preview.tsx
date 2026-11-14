import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export function AboutPreview() {
  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Asymmetric Image Collage with Video Overlay matching KILO Screenshot 4 */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-start order-2 lg:order-1">
            {/* Mint outline frame background */}
            <div className="absolute -top-4 -left-4 w-72 h-80 sm:w-80 sm:h-96 rounded-[32px] border-2 border-[#8EE3D6]/40 -z-0" />

            <div className="relative z-10 w-full max-w-[480px]">
              {/* Back Main Image */}
              <div className="relative w-[85%] aspect-[4/5] rounded-[24px] overflow-hidden shadow-lg bg-gray-100">
                <Image
                  src="/images/about_us_1.jpg"
                  alt="Horemow ministry and fellowship"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 85vw, 480px"
                />
              </div>

              {/* Front Overlapping Image */}
              <div className="absolute top-12 right-0 w-[55%] aspect-square rounded-[20px] overflow-hidden shadow-2xl border-4 border-white bg-gray-100">
                <Image
                  src="/images/about_us_2.jpg"
                  alt="Horemow conference interaction"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 55vw, 264px"
                />
              </div>

              {/* Video Thumbnail Box with Mint Tint & White Circular Play Button */}
              <a
                href={SITE_CONFIG.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Watch Horemow video on YouTube"
                className="absolute -bottom-6 left-6 w-36 sm:w-44 aspect-[4/3] rounded-[16px] overflow-hidden shadow-xl border-2 border-white group block cursor-pointer"
              >
                <Image
                  src="/images/about_us_3.jpg"
                  alt="Conference video preview"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 144px, 176px"
                />
                {/* Mint tint overlay */}
                <div className="absolute inset-0 bg-[#8EE3D6]/40 group-hover:bg-[#8EE3D6]/20 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#0E1020] group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column: Text & Mint Pill Button */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6 order-1 lg:order-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
              About The Movement
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#111320] leading-[1.15] tracking-tight">
              Holiness Revival Movement Worldwide
            </h2>

            <p className="text-base text-[#6B7280] leading-relaxed">
              Founded in 2009 by Pastor Paul Rika and formally inaugurated in Kwali, Abuja in 2010, HOREMOW is an end-time movement operating across Christian denominations to revive biblical righteousness, inward and outward holiness, sanctification, and rapture readiness.
            </p>

            <p className="text-sm text-[#6B7280] leading-relaxed">
              With chapters spanning Nigeria, East and West Africa, North America, and across the globe, the movement treats the 66 books of the Holy Bible as its absolute and final working manual.
            </p>

            <div className="pt-2">
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all duration-200 active:scale-95"
              >
                Learn More
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

