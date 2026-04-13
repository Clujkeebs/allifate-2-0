import Link from "next/link";
import { TrendingUp } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Allifate
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Discover winning TikTok Shop products before everyone else.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Product</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li><Link href="/pricing" className="hover:text-gray-900">Pricing</Link></li>
              <li><Link href="/#features" className="hover:text-gray-900">Features</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-gray-900">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Account</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li><Link href="/login" className="hover:text-gray-900">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-gray-900">Sign up</Link></li>
              <li><Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Allifate. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
