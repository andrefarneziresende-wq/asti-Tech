import { Hero } from "@/components/site/Hero";
import { Services } from "@/components/site/Services";
import { HowItWorks } from "@/components/site/HowItWorks";
import { PricingCta } from "@/components/site/PricingCta";
import { Contact } from "@/components/site/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <HowItWorks />
      <PricingCta />
      <Contact />
    </>
  );
}
