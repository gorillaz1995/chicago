"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const projects = [
  {
    id: 1,
    title: "Dark Creative Solutions",
    description:
      "Website de prezentare pentru agentie de publicitate si print.",
    imageUrl: "/images/portofolio-images/dark-creative.png",
    category: "Web Dev & Design",
    link: "/portofoliu/dark-creative-solutions-website",
  },
  {
    id: 2,
    title: "Dupa apa la Razvan",
    description: "Website de prezentare pentru pensiune in Maramures.",
    imageUrl: "/images/portofolio-images/dupaapx.png",
    category: "Web Dev & Design",
    link: "/portofoliu/dupa-apa-la-razvan-website",
  },

  {
    id: 3,
    title: "Jamon Real",
    description:
      "Sophisticated marketing strategy for a luxury automotive brand",
    imageUrl: "/images/portofolio-images/jamonrell.webp",
    category: "Social Media",
    link: "/portofoliu/jamon-real-social",
  },

  {
    id: 4,
    title: "Ciprian Ungureanu",
    description:
      "Website de prezentare pentru cea mai buna scoala de frizerie din Romania. ",
    imageUrl: "/images/portofolio-images/ungureanu.png",
    category: "Web Dev & Design",
    link: "/portofoliu/ciprian-ungureanu-website",
  },
  {
    id: 5,
    title: "Jamon Real",
    description: "Website de prezentare pentru evenimente culinare speciale.",
    imageUrl: "/images/portofolio-images/jamonrr.png?width=90%",
    category: "Web Dev & Design",
    link: "/portofoliu/jamon-real-website",
  },

  {
    id: 6,
    title: "Saca Experts",
    description: "Website de prezentare pentru agentie recrutare.",
    imageUrl: "/images/portofolio-images/sacax.png?width=90%",
    category: "Web Dev & Design",
    link: "/portofoliu/saca-experts-website",
  },
  {
    id: 7,
    title: "Ciprian Ungureanu",
    description:
      "Website de prezentare pentru cea mai buna scoala de frizerie din Romania. ",
    imageUrl: "/images/portofolio-images/ungci.webp",
    category: "Social Media",
    link: "/portofoliu/ciprian-ungureanu-social",
  },
];

// Get unique categories for filter buttons
const categories = [
  "All",
  ...Array.from(new Set(projects.map((project) => project.category))),
];

export default function PortfolioGrid() {
  const [filter, setFilter] = useState("All");

  // Filter projects based on selected category
  const filteredProjects =
    filter === "All"
      ? projects
      : projects.filter((project) => project.category === filter);

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-background to-background/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header with animation */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-geist text-gray-950">
            Proiecte
          </h2>
          <p className="mt-3 font-geist font-extralight sm:mt-4 text-base sm:text-lg text-black max-w-2xl mx-auto">
            De la idee la executie, de la concept la implementare.
          </p>
        </motion.div>

        {/* Category filter buttons - scrollable on mobile */}
        <div className="flex justify-start sm:justify-center overflow-x-auto pb-2 sm:pb-0 mb-6 sm:mb-8 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex space-x-2 sm:space-x-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Project grid with responsive columns */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full"
        >
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-background rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-md sm:shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out border border-transparent hover:border-primary/10 h-full w-full"
              >
                {/* Project image with hover effect */}
                <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden group w-full">
                  <Image
                    src={project.imageUrl || "/placeholder.svg"}
                    alt={project.title}
                    fill
                    style={{ objectFit: "cover", objectPosition: "center" }}
                    className="transition-transform duration-300 ease-in-out group-hover:scale-105 w-full"
                  />
                  <motion.div
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 transition-opacity duration-300"
                    whileHover={{ opacity: 1 }}
                  >
                    <p className="text-white text-center text-sm sm:text-base lg:text-lg px-4">
                      {project.description}
                    </p>
                  </motion.div>
                </div>
                {/* Project details */}
                <div className="p-4 sm:p-5 md:p-6 lg:p-8 gradient1">
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-primary mb-1">
                    {project.category}
                  </div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-2 line-clamp-1">
                    {project.title}
                  </h3>
                  <Link
                    href={project.link}
                    className="text-primary hover:underline inline-flex items-center text-sm sm:text-base lg:text-lg font-geist"
                  >
                    Vezi proiectul
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1 sm:ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
