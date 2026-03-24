import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function HeroSection() {
  return (
    <div
      className="relative w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content container with proper padding for badges */}
      <div className="container mx-auto px-4 z-10 py-16 pb-16 md:pb-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left content - text and CTA */}
          <motion.div
            className="text-center lg:text-left lg:w-1/2 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-6 py-2 rounded-full bg-blue-100 text-blue-800 font-medium text-sm mb-4">
              Empowering Career Journeys
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tighter">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                AlumNiti
              </span>
            </h1>

            <p className="text-xl md:text-2xl font-medium text-gray-700">
              Niti Shaped by Those Who've Walked the Path Before You
            </p>

            <p className="text-gray-600 max-w-md mx-auto lg:mx-0">
              Expert guidance to help you make informed decisions about your
              academic and career path, with insights from accomplished alumni
              who've been where you are.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-8">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg font-semibold"
                asChild
              >
                <Link href="/register">Get Started</Link>
              </Button>
              <Button
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-full px-8 py-6 text-lg font-semibold"
                asChild
              >
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right content - animation/illustration */}
          <motion.div
            className="lg:w-1/2 w-full mt-8 lg:mt-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative w-full" style={{ height: "280px" }}>
              <DotLottieReact
                src="https://lottie.host/a2fe04a0-f73b-49a2-a72c-5539672980d3/KRenZfcQvp.lottie"
                loop
                autoplay
                className="w-full"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating badges in a fixed position at the bottom */}
      <div className="fixed-bottom-container">
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 px-4 py-3 z-20">
          {[
            "Personalized Guidance",
            "Expert Mentorship",
            "College Insights",
            "Alumni Network",
            "Career Planning",
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white bg-opacity-80 backdrop-blur-md px-4 py-2 md:px-5 md:py-2.5 rounded-full shadow-md text-sm md:text-base font-medium text-gray-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add this CSS for the fixed bottom container */}
      <style jsx>{`
        .fixed-bottom-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          margin-bottom: 1rem;
          z-index: 20;
        }

        @media (max-width: 768px) {
          .fixed-bottom-container {
            position: relative;
            margin-top: 0.5rem;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
