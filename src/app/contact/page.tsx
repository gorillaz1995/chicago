/**
 * Simple contact page replacing the removed dragon 3D hero.
 * Uses existing Romanian copy so the nav CONTACT link still resolves.
 */
export default function ContactPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-[#f8f8f8] to-[#eaeaea] px-4 py-24 sm:px-6 lg:px-10">
      <section
        className="w-full max-w-xl rounded-2xl bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8 lg:p-10"
        aria-labelledby="contact-title"
      >
        {/* Eyebrow matching the homepage close section tone */}
        <p className="font-geist text-[0.72rem] uppercase tracking-[0.12em] text-[#6e6e6e]">
          Hai să vorbim
        </p>
        <h1
          id="contact-title"
          className="mt-3 font-ogg text-3xl font-bold leading-tight tracking-tight text-[#111111] sm:text-4xl lg:text-5xl"
        >
          Ai o idee?
        </h1>
        <p className="mt-2 font-ogg text-2xl font-light text-[#d9728f] sm:text-3xl">
          Eu am tehnologia!
        </p>
        <p className="mt-6 font-geist text-sm font-semibold text-[#111111] sm:text-base">
          Fara termeni tehnici, doar rezultate.
        </p>
        <p className="mt-3 font-geist text-sm font-thin text-[#6e6e6e] sm:text-base">
          Transparenta totala, tu detii controlul asupra proiectului.
        </p>
      </section>
    </main>
  );
}
