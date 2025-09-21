//app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Stethoscope, 
  Users, 
  Calendar, 
  FileText, 
  Shield, 
  Clock, 
  Heart, 
  Activity,
  ArrowRight,
  CheckCircle,
  Star,
  Phone,
  Mail,
  MapPin,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import HeroAnimation from "@/components/landing/hero-animation";
import ScrollToTop from "@/components/landing/scroll-to-top";
import ClientOnly from "@/components/client-only";
import BackgroundTest from "@/components/background-test";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const features = [
    {
      icon: <Stethoscope className="h-8 w-8 text-purple-500" />,
      title: "Patient Management",
      description: "Comprehensive patient records, medical history, and appointment scheduling in one place."
    },
    {
      icon: <Calendar className="h-8 w-8 text-violet-500" />,
      title: "Appointment Scheduling",
      description: "Smart scheduling system with automated reminders and conflict resolution."
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Digital Prescriptions",
      description: "Create, manage, and track prescriptions with integrated pharmacy connectivity."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-400" />,
      title: "Staff Management",
      description: "Manage doctors, nurses, and administrative staff with role-based access control."
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-700" />,
      title: "HIPAA Compliant",
      description: "Enterprise-grade security with full HIPAA compliance and data encryption."
    },
    {
      icon: <Activity className="h-8 w-8 text-purple-500" />,
      title: "Analytics & Reports",
      description: "Comprehensive analytics and reporting tools for better decision making."
    }
  ];

  const stats = [
    { number: "10,000+", label: "Patients Served" },
    { number: "500+", label: "Healthcare Providers" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "24/7", label: "Support Available" }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Johnson",
      role: "Chief Medical Officer",
      content: "MedixPro has revolutionized our clinic operations. The intuitive interface and comprehensive features have improved our efficiency by 40%.",
      rating: 5
    },
    {
      name: "Dr. Michael Chen",
      role: "Family Physician",
      content: "The patient management system is outstanding. I can access patient records instantly and provide better care.",
      rating: 5
    },
    {
      name: "Nurse Emily Rodriguez",
      role: "Head Nurse",
      content: "The scheduling system has eliminated double bookings and improved our workflow significantly.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950" style={{ backgroundColor: 'white' }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">MedixPro</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors font-medium">Features</Link>
              <Link href="#about" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors font-medium">About</Link>
              <Link href="#testimonials" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors font-medium">Testimonials</Link>
              <Link href="#contact" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors font-medium">Contact</Link>
              <Button variant="outline" className="border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg" asChild>
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMounted && isMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link href="#features" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Features</Link>
                <Link href="#about" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">About</Link>
                <Link href="#testimonials" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Testimonials</Link>
                <Link href="#contact" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Contact</Link>
                <div className="px-3 py-2 space-y-2">
                  <Button variant="outline" className="w-full border-slate-200 dark:border-slate-700" asChild>
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700" asChild>
                    <Link href="/auth/register">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950" style={{ backgroundColor: 'white' }}>
        <div className="container mx-auto">
          <div className="text-center max-w-5xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <Star className="h-4 w-4 mr-1 text-purple-600" />
              Trusted by 500+ Healthcare Providers
            </Badge>
            <ClientOnly>
              <HeroAnimation />
            </ClientOnly>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-8 leading-tight tracking-tight">
              Modern Healthcare
              <span className="block bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Management System</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Streamline your clinic operations with our comprehensive, HIPAA-compliant platform designed for modern healthcare providers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-10 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                <Link href="/auth/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800" asChild>
                <Link href="#features">View Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 group-hover:scale-105 transition-transform duration-300">{stat.number}</div>
                <div className="text-slate-600 dark:text-slate-400 font-medium text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950" style={{ backgroundColor: 'white' }}>
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Everything You Need to Manage Your Practice
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Comprehensive tools designed specifically for healthcare providers to deliver exceptional patient care.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group bg-white dark:bg-slate-900">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-8">
                Why Choose <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">MedixPro</span>?
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
                Built by healthcare professionals for healthcare professionals. Our platform combines cutting-edge technology with deep industry expertise to deliver the most comprehensive clinic management solution.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 group">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium text-lg">HIPAA Compliant & Secure</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium text-lg">24/7 Customer Support</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium text-lg">Easy Integration & Migration</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium text-lg">Regular Updates & Improvements</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 rounded-3xl p-10 text-white shadow-2xl">
                <h3 className="text-3xl font-bold mb-6">Ready to Transform Your Practice?</h3>
                <p className="text-purple-100 mb-8 leading-relaxed text-lg">
                  Join thousands of healthcare providers who have already made the switch to MedixPro.
                </p>
                <Button variant="secondary" size="lg" className="bg-white text-purple-600 hover:bg-purple-50 shadow-lg text-lg px-8 py-4" asChild>
                  <Link href="/auth/register">Get Started Today</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950" style={{ backgroundColor: 'white' }}>
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              What Our Customers Say
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Trusted by healthcare professionals worldwide
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group bg-white dark:bg-slate-900">
                <CardHeader>
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-lg italic leading-relaxed text-slate-600 dark:text-slate-300">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold text-slate-900 dark:text-white text-lg">{testimonial.name}</div>
                  <div className="text-slate-600 dark:text-slate-400">{testimonial.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Get in <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Touch</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Ready to get started? Contact us today for a personalized demo.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group bg-white dark:bg-slate-900">
              <CardContent className="pt-8 pb-8">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Phone className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-xl">Phone</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">+1 (555) 123-4567</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group bg-white dark:bg-slate-900">
              <CardContent className="pt-8 pb-8">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Mail className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-xl">Email</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">support@medixpro.com</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group bg-white dark:bg-slate-900">
              <CardContent className="pt-8 pb-8">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-xl">Address</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">123 Healthcare Ave, Medical City, MC 12345</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">MedixPro</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-lg">
                Modern healthcare management system for the digital age.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white text-xl">Product</h3>
              <ul className="space-y-3 text-slate-300">
                <li><Link href="#features" className="hover:text-white transition-colors text-lg">Features</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors text-lg">Pricing</Link></li>
                <li><Link href="#testimonials" className="hover:text-white transition-colors text-lg">Testimonials</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white text-xl">Support</h3>
              <ul className="space-y-3 text-slate-300">
                <li><Link href="#contact" className="hover:text-white transition-colors text-lg">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors text-lg">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors text-lg">Help Center</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6 text-white text-xl">Legal</h3>
              <ul className="space-y-3 text-slate-300">
                <li><Link href="#" className="hover:text-white transition-colors text-lg">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors text-lg">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors text-lg">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-12 pt-8 text-center text-slate-400">
            <p className="text-lg">&copy; 2024 MedixPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      <ClientOnly>
        <ScrollToTop />
      </ClientOnly>
    </div>
  );
}
