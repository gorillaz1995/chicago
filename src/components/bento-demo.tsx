import { TrendingUp, Share2Icon, Layers, Github } from "lucide-react";

import { cn } from "@/lib/utils";
import AnimatedBeamMultipleOutputDemo from "@/components/animated-beam-multiple-outputs";
import AnimatedListDemo from "@/components/animated-list-demo";
import { BentoCard, BentoGrid } from "@/components/bento-grid";
import { Marquee } from "@/components/marquee";
import { BoxRevealDemo } from "@/app/components/Oer/box-reveal-demo";

const files = [
  {
    name: "facturi.pdf",
    body: `FACTURA FISCALĂ\n
      Seria RO | Nr. 2023-156\n
      \n
      FURNIZOR                                  CLIENT\n
      SC EXPERT CONSULTING SRL                  SC DORU SRL\n
      CUI: RO12345678                          CUI: RO87654321\n
      \n
      PRODUSE/SERVICII\n
      Servicii consultanță profesională............1.500,00 lei\n
      TVA (19%).................................285,00 lei\n
      TOTAL DE PLATĂ............................1.785,00 lei\n
      \n
      Data scadentă: 15.04.2023\n
      Modalitate plată: Transfer bancar`,
  },
  {
    name: "situatie_financiara.xlsx",
    body: `RAPORT FINANCIAR - IANUARIE 2023\n
      \n
      VENITURI OPERAȚIONALE\n
      Venituri din servicii.....................45.600,00 lei\n
      \n
      CHELTUIELI OPERAȚIONALE\n 
      Cheltuieli totale........................28.900,00 lei\n
      \n
      REZULTATE FINANCIARE\n
      Profit brut..............................16.700,00 lei\n
      Taxe și impozite.........................2.670,00 lei\n
      Profit net..............................14.030,00 lei\n
      \n
      Creștere față de luna precedentă: +12%`,
  },
  {
    name: "Logo.svg",
    body: `<?xml version="1.0" encoding="UTF-8"?>\n
      <svg width='100' height='50' viewBox="0 0 100 50">\n
        <rect width='40' height='40' fill='#2B60DE'/>\n
        <text x='45' y='25' fill='#333' font-family="Arial" font-weight="bold">\n
          FIRMA SRL\n
        </text>\n
      </svg>`,
  },
  {
    name: "contracte_furnizori.docx",
    body: `CONTRACT DE FURNIZARE\n
      Nr. 2023/45 din 01.01.2023\n
      \n
      PĂRȚI CONTRACTANTE\n
      Furnizor: Materiale SRL\n
      Beneficiar: Expert Consulting SRL\n
      \n
      OBIECTUL CONTRACTULUI\n
      Art.1 Livrare consumabile birou\n
      \n
      VALOARE CONTRACT\n
      Valoare lunară: 890,00 lei + TVA\n
      Termen livrare: 48 ore\n
      Durata contract: 12 luni`,
  },
  {
    name: "instructiuni_soft.txt",
    body: `GHID UTILIZARE - GENERARE RAPORT LUNAR\n
      \n
      Pași necesari:\n
      1. Accesați modulul "Rapoarte" din meniul principal\n
      2. În secțiunea "Interval", selectați:\n
         - Data început: 01 luna curentă\n
         - Data sfârșit: 31 luna curentă\n
      3. Din categoria "Tip Raport", bifați opțiunea "Centralizator"\n
      4. Click pe butonul "Export PDF" din partea dreaptă jos\n
      \n
      Notă: Asigurați-vă că aveți toate datele actualizate înainte de generare`,
  },
];

const features = [
  {
    Icon: TrendingUp,
    name: "Ramai relevant",
    description: "Mereu cu un pas inaintea competitiei!",
    className: "col-span-3 lg:col-span-1",
    background: (
      <AnimatedListDemo className="absolute right-2 top-4 h-[300px] w-full scale-75 border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-90" />
    ),
    href: "/notifications",
    cta: "View Notifications",
  },
  {
    Icon: Layers,
    name: "Salveaza timp",
    description: "Toate fluxurile, atat interne cat si externe, centralizate.",
    className: "col-span-3 lg:col-span-2",
    background: (
      <Marquee
        pauseOnHover
        className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)]"
      >
        {files.map((f, idx) => (
          <figure
            key={idx}
            className={cn(
              "relative w-64 h-96 cursor-pointer overflow-hidden rounded-xl border p-4",
              "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",

              "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none"
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col">
                <figcaption className="text-sm font-lg dark:text-white">
                  {f.name}
                </figcaption>
              </div>
            </div>
            <blockquote className="mt-2 text-xs">{f.body}</blockquote>
          </figure>
        ))}
      </Marquee>
    ),
    href: "/files",
    cta: "View Files",
  },
  {
    Icon: Share2Icon,
    name: "Asistenta A.I. personalizata.",
    description: "Automatizarea intregului proces de digital marketing. ",
    className: "col-span-3 lg:col-span-2",
    background: (
      <AnimatedBeamMultipleOutputDemo className="absolute right-2 top-4 h-[300px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
    ),
    href: "/integrations",
    cta: "Learn More",
  },
  {
    Icon: Github,
    name: "Solutii no-code, low-code si custom",
    description: "Pentru a rezolva orice problema, in orice domeniu.",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-[0.9]">
        <BoxRevealDemo />
      </div>
    ),
    href: "/icons",
    cta: "Explore Icons",
  },
];

export default function BentoDemo() {
  return (
    <BentoGrid>
      {features.map((feature, idx) => (
        <BentoCard key={idx} {...feature} />
      ))}
    </BentoGrid>
  );
}
