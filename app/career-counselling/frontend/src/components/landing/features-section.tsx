import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Expert Guidance",
    description: "Connect with experienced professionals who have successfully navigated their academic and career paths.",
    icon: "/icons/expert-guidance.svg",
    color: "from-blue-500 to-blue-600",
    delay: 0.1,
  },
  {
    title: "College Insights",
    description: "Access comprehensive data and alumni reviews about colleges across India to make informed decisions.",
    icon: "/icons/college-insights.svg",
    color: "from-purple-500 to-purple-600",
    delay: 0.2,
  },
  {
    title: "Career Assessments",
    description: "Discover your strengths and ideal career paths with interactive assessments like the RIASEC personality test.",
    icon: "/icons/assessment.svg",
    color: "from-amber-500 to-amber-600",
    delay: 0.3,
  },
  {
    title: "Mentorship Sessions",
    description: "Schedule one-on-one sessions with mentors who can provide tailored advice for your unique situation.",
    icon: "/icons/mentorship.svg",
    color: "from-pink-500 to-pink-600",
    delay: 0.4,
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Features Designed for Your Success
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AlumNiti provides all the tools and resources you need to navigate your educational journey and career path with confidence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: feature.delay }}
            >
              {index === 2 ? (
                <Link href="/assessments/riasec" className="block h-full">
                  <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer">
                    <CardContent className="p-0">
                      <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                      <div className="p-6">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-7 h-7 text-blue-600"
                          >
                            {/* Bar chart icon for index 2 */}
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                  <CardContent className="p-0">
                    <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                    <div className="p-6">
                      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-blue-600"
                        >
                          {index === 0 && (
                            <>
                              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                              <line x1="6" y1="1" x2="6" y2="4" />
                              <line x1="10" y1="1" x2="10" y2="4" />
                              <line x1="14" y1="1" x2="14" y2="4" />
                            </>
                          )}
                          {index === 1 && (
                            <>
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </>
                          )}
                          {index === 2 && (
                            <>
                              <line x1="12" y1="20" x2="12" y2="10" />
                              <line x1="18" y1="20" x2="18" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="16" />
                            </>
                          )}
                          {index === 3 && (
                            <>
                              <path d="M9 20H7a2 2 0 01-2-2v-7c0-2 2-4 4-4h2" />
                              <path d="M14 10h2a2 2 0 012 2v7c0 1.1-.9 2-2 2h-2" />
                              <path d="M12 16v-5.5" />
                              <path d="M10 13h4" />
                              <circle cx="12" cy="7" r="3" />
                            </>
                          )}
                          {index === 4 && (
                            <>
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </>
                          )}
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <a
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-8"
          >
            Start Your Journey
          </a>
        </motion.div>
      </div>
    </section>
  );
}
