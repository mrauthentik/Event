import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "About Horemow",
  description: "About the Holiness Revival Movement Worldwide.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-16 sm:py-20">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">About the Ministry</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Holiness Revival Movement Worldwide</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">Horemow is a non-denominational Christian ministry.</p>
        </div>
      </section>
      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 space-y-8">
          <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6 sm:p-8 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Organizer copy needed</span>
            <h2 className="text-2xl font-bold text-[#111320]">Ministry profile</h2>
            <p className="text-sm leading-relaxed text-amber-950">
              The approved history, mission, and ministry background have not yet been supplied. This section will be updated when the organizers provide that copy.
            </p>
          </section>
          <div className="text-center">
            <Link href="/conference" className="inline-flex rounded-full bg-[#8EE3D6] px-7 py-3 text-sm font-bold text-[#0E1020] hover:bg-[#7BD4C7]">
              Conference Information
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
