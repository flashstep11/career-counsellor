import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="global-footer relative z-40 bg-black text-white w-full">
      <div className="md:ml-64 px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Company Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-primary-blue">AlumNiti</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Guiding students towards their perfect career path.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Quick Links</h4>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-primary-blue transition-colors">About</Link></li>
              <li><Link href="mailto:aditya.jain.pansari@research.iiit.ac.in" className="hover:text-primary-blue transition-colors">Contact Us</Link></li>
              <li><Link href="/careers" className="hover:text-primary-blue transition-colors">Careers</Link></li>
              <li><Link href="/become-expert" className="hover:text-primary-blue transition-colors">Become an Expert</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Resources</h4>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li><Link href="/blogs" className="hover:text-primary-blue transition-colors">Blogs</Link></li>
              <li><Link href="/videos" className="hover:text-primary-blue transition-colors">Videos</Link></li>
              <li><Link href="/experts" className="hover:text-primary-blue transition-colors">Find an Expert</Link></li>
              <li><Link href="/assessments/riasec" className="hover:text-primary-blue transition-colors">RIASEC Assessment</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Legal</h4>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-primary-blue transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary-blue transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookie" className="hover:text-primary-blue transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-4 bg-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <p>© 2025 AlumNiti. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary-blue">
              Facebook
            </Link>
            <Link href="#" className="hover:text-primary-blue">
              Twitter
            </Link>
            <Link href="#" className="hover:text-primary-blue">
              LinkedIn
            </Link>
            <Link href="#" className="hover:text-primary-blue">
              Instagram
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
