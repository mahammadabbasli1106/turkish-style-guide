import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturesSection from "@/components/FeaturesSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <ShowcaseSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
