import Link from "next/link";
import { Info, Mail, Briefcase, Scale } from "lucide-react";

export function SideFooter() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        AlumNiti
      </p>
      <ul className="space-y-2">
        <li>
          <Link
            href="/about"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            About Us
          </Link>
        </li>
        <li>
          <Link
            href="mailto:aditya.jain.pansari@research.iiit.ac.in"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Contact Us
          </Link>
        </li>
        <li>
          <Link
            href="/careers"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            Career
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <Scale className="h-3.5 w-3.5 shrink-0" />
            Legal Policy
          </Link>
        </li>
      </ul>
      <p className="text-xs text-gray-300 mt-4 border-t border-gray-50 pt-3">
        © {new Date().getFullYear()} AlumNiti. All rights reserved.
      </p>
    </div>
  );
}
