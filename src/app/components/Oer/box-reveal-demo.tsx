import { Button } from "@/components/ui/button";
import { BoxReveal } from "./box-reveal";

export function BoxRevealDemo() {
  return (
    <div className="size-full max-w-lg items-center justify-center overflow-hidden pt-8">
      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <p className="text-[3.5rem] font-semibold font-geist text-center">
          PROMPT Engineer<span className="text-[#FF1212]">.</span>
        </p>
      </BoxReveal>

      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <h2 className="mt-[.5rem] text-[1rem]">
          Utilizare A.I. pentru solutii eficiente, costuri reduse si timp
          salvat. <span className="text-[#FF1212]">Convinge-te singur!</span>
        </h2>
      </BoxReveal>

      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <div className="mt-6">
          <p>
            -&gt; 20+ free and open-source animated components built with
            <span className="font-semibold text-[#FF1212]">React</span>,
            <span className="font-semibold text-[#FF1212]">Typescript</span>,
            <span className="font-semibold text-[#FF1212]">Tailwind CSS</span>,
            and
            <span className="font-semibold text-[#FF1212]">Motion</span>
            . <br />
            -&gt; 100% open-source, and customizable. <br />
          </p>
        </div>
      </BoxReveal>

      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <Button className="mt-[1.6rem] bg-[#FF1212]">Explore</Button>
      </BoxReveal>
    </div>
  );
}
