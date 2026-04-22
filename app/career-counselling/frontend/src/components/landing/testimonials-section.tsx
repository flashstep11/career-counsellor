import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "AlumNiti transformed my career planning journey. The personalized guidance from alumni who had taken similar paths was invaluable.",
    name: "Rahul Singh",
    title: "IIT Delhi Student",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
    rating: 5,
  },
  {
    quote:
      "The expert mentorship helped me make informed decisions about my medical career. I wouldn't be at AIIMS today without their support.",
    name: "Priya Patel",
    title: "AIIMS Student",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    rating: 5,
  },
  {
    quote:
      "The college insights and data provided by AlumNiti were comprehensive and helped me choose the right institution for my engineering degree.",
    name: "Vikram Mehta",
    title: "BITS Pilani Graduate",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    rating: 4,
  },
  {
    quote:
      "As a first-generation college student, I was lost until I found AlumNiti. Their career roadmaps guided me to a successful career in computer science.",
    name: "Nisha Kumar",
    title: "Google Software Engineer",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    rating: 5,
  },
  {
    quote:
      "The one-on-one sessions with mentors who had worked at my dream companies gave me insights I couldn't have found anywhere else.",
    name: "Arjun Reddy",
    title: "Management Consultant",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    rating: 5,
  },
  {
    quote:
      "I was able to network with industry professionals and gain practical knowledge that set me apart in my job applications. AlumNiti is a game-changer!",
    name: "Sneha Verma",
    title: "Data Scientist at Amazon",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    rating: 4,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Success Stories from Our Community
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from students and professionals who transformed their careers
            with AlumNiti's guidance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={i < testimonial.rating ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-5 h-5 ${
                          i < testimonial.rating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>

                  <blockquote className="text-lg text-gray-700 italic mb-8">
                    "{testimonial.quote}"
                  </blockquote>

                  <div className="flex items-center">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm mr-4">
                      <AvatarImage
                        src={testimonial.image}
                        alt={testimonial.name}
                      />
                      <AvatarFallback>
                        {testimonial.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {testimonial.title}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
          <Link
            href="/experts"
            className="inline-flex items-center justify-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-8 transition-all duration-300"
          >
            Meet Our Experts
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
