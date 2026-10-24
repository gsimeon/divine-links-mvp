import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata = {
  title: "Make an enquiry | Divine Links",
  description: "Tell Divine Links what telecom or networking support you are looking for."
};

export default async function EnquirePage({ searchParams }: { searchParams: Promise<{ service?: string; audience?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-divine-ice/60 py-12 sm:py-16">
        <div className="container grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div className="pt-2">
            <p className="eyebrow">LET’S TALK</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-divine-ink sm:text-5xl">Tell us what you need.</h1>
            <p className="mt-5 max-w-md leading-7 text-divine-muted">Share a few details and our team can review your request. We’ll confirm availability and next steps with you before any purchase, payment or appointment.</p>
            <div className="mt-8 rounded-2xl border border-divine-border bg-white p-5">
              <p className="font-bold text-divine-ink">What happens next?</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-divine-muted">
                <li className="flex gap-3"><span className="text-divine-teal">✓</span> We review the information you submit.</li>
                <li className="flex gap-3"><span className="text-divine-teal">✓</span> We may contact you to clarify your requirements.</li>
                <li className="flex gap-3"><span className="text-divine-teal">✓</span> We confirm availability and any quote before proceeding.</li>
              </ul>
            </div>
            <p className="mt-4 text-xs leading-5 text-divine-muted">Please don’t include passwords, payment card details or other sensitive information in this form.</p>
          </div>
          <div className="rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-9">
            <EnquiryForm initialService={params.service ?? ""} initialAudience={params.audience ?? ""} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
