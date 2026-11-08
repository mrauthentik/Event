import Image from "next/image";
import { Globe, Sparkles } from "lucide-react";
import { FacebookIcon, YoutubeIcon } from "@/components/icons/social-icons";

export interface MinisterProps {
  name: string;
  role: string;
  bio: string;
  image: string;
  socials?: {
    youtube?: string;
    facebook?: string;
    website?: string;
  };
}

export function MinisterCard({ name, role, bio, image, socials }: MinisterProps) {
  return (
    <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-gray-100/80 grid grid-cols-1 md:grid-cols-12 transition-transform duration-300 hover:-translate-y-1">
      {/* Left half: Full-bleed portrait image */}
      <div className="md:col-span-5 relative min-h-[320px] md:min-h-full aspect-[4/5] bg-gray-100">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover object-top"
        />
      </div>

      {/* Right half: Content */}
      <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0E7A6E]">
            {role}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#111320] tracking-tight">
            {name}
          </h3>
          <p className="text-sm text-[#6B7280] leading-relaxed pt-1">
            {bio}
          </p>
        </div>

        {/* Circular outlined social buttons */}
        <div className="flex items-center gap-2 pt-6 border-t border-gray-100 mt-6">
          {socials?.youtube && (
            <a
              href={socials.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} YouTube`}
              className="w-8 h-8 rounded-full border border-gray-200 hover:border-[#8EE3D6] hover:bg-[#EAF9F7] text-gray-500 hover:text-[#0E1020] flex items-center justify-center transition-colors"
            >
              <YoutubeIcon className="w-3.5 h-3.5" />
            </a>
          )}
          {socials?.facebook && (
            <a
              href={socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} Facebook`}
              className="w-8 h-8 rounded-full border border-gray-200 hover:border-[#8EE3D6] hover:bg-[#EAF9F7] text-gray-500 hover:text-[#0E1020] flex items-center justify-center transition-colors"
            >
              <FacebookIcon className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="text-xs text-gray-400 font-medium pl-1">
            Official Ministry Channel
          </span>
        </div>
      </div>
    </div>
  );
}

export function MoreMinistersCard() {
  return (
    <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] rounded-[24px] border-2 border-dashed border-[#CDEFEA] p-8 flex flex-col items-center justify-center text-center min-h-[300px] space-y-4">
      <div className="w-12 h-12 rounded-full bg-[#EAF9F7] text-[#0E1020] flex items-center justify-center shadow-sm">
        <Sparkles className="w-5 h-5 text-[#0E7A6E]" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-xl font-bold text-[#111320]">
          More Ministers To Be Announced
        </h4>
        <p className="text-sm text-[#6B7280]">
          Additional international guest speakers and choir directors will be confirmed as the conference date approaches.
        </p>
      </div>
      <div className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#0E7A6E] bg-white px-4 py-2 rounded-full shadow-sm">
        Stay Tuned
      </div>
    </div>
  );
}
