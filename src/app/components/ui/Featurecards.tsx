import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionDemo() {
  const features = [
    {
      title: "Design personalizat din linii de cod",
      description:
        "Esti perfectionist? Asezam fiecare pixel fix cum iti doresti. Fara limitari tehnice, design atractiv si functional.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Usor de folosit",
      description:
        "Toate beneficiile unui template (Wordpress, Wix, Framer etc.). Usor de modificat si de actualizat.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Preturi accesibile",
      description:
        "Timp de livrare asemanator solutiilor no-code. Implementare rapida.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Gazduire Website GRATIS",
      description:
        "Bucura-te de gazduire gratuita cu acoperire internationala. Tu detii controlul total, la final vei avea toate conturile si un trainning cum sa le accesezi.",
      icon: <IconCloud />,
    },
    {
      title: "Social Media cu obiective bine definite",
      description:
        "Campanii si strategii digitale create sa livreze rezultate, indiferent de KPI-uri. Fara postat la intamplare.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Disponibilitate 24/7 pe WhatsApp",
      description:
        "Esti disponibil doar seara sau doar in weekend? No problem! Ma poti contacta oricand, flexibilitate maxima.",
      icon: <IconHelp />,
    },
    {
      title: "Continut care nu se pierde in haosul digital.",
      description:
        "Creez povesti autentice, relevante si care se leaga de viata reala a clientilor tai. De la texte personalizate la imagini si videoclipuri iesite din tipar.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Transparenta 100%",
      description:
        "Vei fi mereu la curent cu ce fac, de ce o fac, cat dureaza si cat costa. Nu exista surprize neplacute.",
      icon: <IconHeart />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative gradient group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-red-800 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100 font-geist font-semibold">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-900 dark:text-neutral-300 max-w-xs relative z-10 px-10 font-geist font-light">
        {description}
      </p>
    </div>
  );
};
