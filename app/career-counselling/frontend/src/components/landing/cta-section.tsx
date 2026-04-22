import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient with animated shapes */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-white opacity-5 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        
        {/* Animated floating elements */}
        <motion.div 
          className="absolute top-10 left-1/4 w-16 h-16 bg-white opacity-10 rounded-full"
          animate={{ 
            y: [0, -20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-10 right-1/4 w-12 h-12 bg-white opacity-10 rounded-full"
          animate={{ 
            y: [0, 20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Ready to Shape Your Future with AlumNiti?
            </h2>
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto">
              Join thousands of students who've found their perfect career path with AlumNiti. Start your journey today and benefit from the wisdom of those who've walked the path before you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                asChild
              >
                <Link href="/register">Get Started Now</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-full transition-all duration-300"
                asChild
              >
                <Link href="/about">Learn More</Link>
              </Button>
            </div>

            <div className="mt-12 text-sm text-blue-100 flex flex-wrap justify-center gap-x-8 gap-y-3">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Free Career Assessment</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Access to Expert Network</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Personalized Roadmap</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
