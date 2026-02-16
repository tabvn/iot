"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from 'motion/react';
import {
  Activity,
  Zap,
  Code,
  Shield,
  Globe,
  LineChart,
  CheckCircle,
  ArrowRight,
  Cpu,
  Sparkles,
  Users,
  Lock,
  Webhook,
  BarChart3,
  Play,
  Star,
  Wifi,
  Cloud,
  Database,
  Terminal,
  Boxes,
  Radio,
  GitBranch,
  Palette,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'curl' | 'esp32' | 'python' | 'go'>('javascript');

  const demoSlides = [
    {
      title: 'Real-Time Device Dashboard',
      description: 'Monitor all your IoT devices in one place. See live status, connectivity, sensor readings, and health metrics with beautiful visualizations. Get instant alerts when devices go offline or thresholds are exceeded.',
      image: 'https://images.unsplash.com/photo-1747224317357-6e6985e52f42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJb1QlMjBkYXNoYm9hcmQlMjByZWFsLXRpbWUlMjBtb25pdG9yaW5nJTIwZGV2aWNlc3xlbnwxfHx8fDE3Njk5MzIyMDJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
      features: ['Live device status', 'Real-time sensor data', 'Health monitoring', 'Instant alerts']
    },
    {
      title: 'Flexible Device Management',
      description: 'Connect any device with dynamic JSON structure - no predefined schemas required. Our field mapping system lets you customize how data is displayed and labeled. Perfect for embedded IoT developers working with diverse hardware.',
      image: 'https://images.unsplash.com/photo-1746893737268-81fe686e6a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJb1QlMjBzZW5zb3IlMjBuZXR3b3JrJTIwY29ubmVjdGl2aXR5JTIwZGV2aWNlc3xlbnwxfHx8fDE3Njk5MzIyMDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Cpu,
      color: 'from-blue-500 to-cyan-500',
      features: ['Dynamic JSON support', 'Custom field mapping', 'No schema required', 'Any device type']
    },
    {
      title: 'Developer-First API',
      description: 'Comprehensive REST API with code examples in JavaScript, Python, Go, ESP32, and CURL. Complete documentation, webhook support, and API key management. Built by developers, for developers.',
      image: 'https://images.unsplash.com/photo-1669023414180-4dcf35d943e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXZlbG9wZXIlMjBBUEklMjBjb2RlJTIwaW50ZWdyYXRpb24lMjB0ZXJtaW5hbHxlbnwxfHx8fDE3Njk5MzIyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Code,
      color: 'from-purple-500 to-pink-500',
      features: ['RESTful API', 'Multi-language SDKs', 'API key auth', 'Complete docs']
    },
    {
      title: 'Automation & Workflows',
      description: 'Create powerful automation rules with a visual rule builder. Trigger actions based on device events, sensor thresholds, or time schedules. No code required - build complex IoT workflows with simple drag-and-drop.',
      image: 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdXRvbWF0aW9uJTIwd29ya2Zsb3clMjBydWxlcyUyMHRyaWdnZXJzfGVufDF8fHx8MTc2OTkyNTI0Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Webhook,
      color: 'from-orange-500 to-red-500',
      features: ['Visual rule builder', 'Event triggers', 'Webhook actions', 'No-code automation']
    },
    {
      title: 'Advanced Analytics',
      description: 'Visualize sensor data with interactive charts. Track historical trends, export data for analysis, and gain insights from your IoT devices. Built-in support for time-series data and custom date ranges.',
      image: 'https://images.unsplash.com/photo-1767788115794-0e93fb905016?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwY2hhcnRzJTIwZ3JhcGhzJTIwdmlzdWFsaXphdGlvbnxlbnwxfHx8fDE3Njk5MzIyMDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: BarChart3,
      color: 'from-indigo-500 to-blue-500',
      features: ['Interactive charts', 'Historical data', 'Data export', 'Custom date ranges']
    },
    {
      title: 'Team Collaboration',
      description: 'Manage workspace members with granular role-based permissions. Invite team members as Admin, Developer, or Viewer. Each workspace can have its own team and subscription plan - perfect for agencies and consultants.',
      image: 'https://images.unsplash.com/photo-1635185481431-661b09594e6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZSUyMG1lbWJlcnN8ZW58MXx8fHwxNzY5OTMyMjA0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      icon: Users,
      color: 'from-pink-500 to-rose-500',
      features: ['Role-based access', 'Invite members', 'Per-workspace teams', 'Admin controls']
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      // Scroll spy - detect which section is in view
      const sections = ['hero', 'features', 'pricing', 'api'];
      const scrollPosition = window.scrollY + 200; // Offset for navbar

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const { offsetTop, offsetHeight } = section;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    handleScroll(); // Run on mount
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight = 80; // Height of fixed navbar
      const elementPosition = element.offsetTop - navbarHeight;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  const features = [
    {
      icon: Cpu,
      title: 'Flexible Device Management',
      description: 'Support any device type with dynamic JSON data structures. No predefined schemas required.',
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description: 'Live data streams, health metrics, and instant alerts for all your connected devices.',
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Code,
      title: 'Developer-First API',
      description: 'RESTful API with comprehensive docs and code examples in multiple languages.',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: Webhook,
      title: 'Webhooks & Automation',
      description: 'Create powerful rules, triggers, and automated workflows without writing code.',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Visualize sensor data, track trends, and export historical data for analysis.',
      gradient: 'from-indigo-500 to-blue-500',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Manage workspace members with granular role-based access permissions.',
      gradient: 'from-pink-500 to-rose-500',
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50 ? 'bg-white/95 backdrop-blur-lg shadow-lg' : 'bg-white/80 backdrop-blur-lg'
        } border-b border-gray-200`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Logo variant="full" size="md" />
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              <motion.button
                key="features"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => scrollToSection('features')}
                className="relative text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors capitalize"
              >
                <span className={activeSection === 'features' ? 'text-blue-600' : ''}>
                  Features
                </span>
                {activeSection === 'features' && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => scrollToSection('pricing')}
                className="relative text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors capitalize"
              >
                <span className={activeSection === 'pricing' ? 'text-blue-600' : ''}>
                  Pricing
                </span>
                {activeSection === 'pricing' && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative"
              >
                <Link href="/developer" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors capitalize">
                  Developer
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3"
            >
              {isAuthenticated ? (
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="mb-6 bg-blue-100 text-blue-700 border-blue-200 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Developer-First IoT Platform
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Build & Monitor{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                IoT at Scale
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto"
            >
              Connect unlimited devices, visualize real-time data, and automate workflows.
              Built for embedded developers who demand flexibility and power.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 text-base px-8 h-12"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 text-base px-8 h-12" onClick={() => setShowDemoModal(true)}>
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Cancel anytime
              </div>
            </motion.div>
          </div>

          {/* Dashboard Preview Cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-20 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              { icon: Activity, label: 'Active Devices', value: '127', color: 'green' },
              { icon: Zap, label: 'Events/sec', value: '1.2K', color: 'blue' },
              { icon: Database, label: 'Data Points', value: '5.8M', color: 'purple' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + idx * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="border-2 bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-100 flex items-center justify-center`}>
                        <stat.icon className={`w-7 h-7 text-${stat.color}-600`} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                        <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section - Improved Cards */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200 px-4 py-1.5">
              Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Build IoT
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for developers who need flexibility and control
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -8 }}
              >
                <Card className="border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 h-full group overflow-hidden relative">
                  {/* Gradient border on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} style={{ padding: '2px' }}>
                    <div className="bg-white rounded-xl h-full w-full"></div>
                  </div>

                  <CardContent className="p-8 relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className={`w-16 h-16 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 group-hover:shadow-lg transition-all`}
                    >
                      <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                    </motion.div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                      {feature.title}
                    </h3>

                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <motion.div
                      className="mt-6 flex items-center gap-2 text-sm font-semibold text-gray-400 group-hover:text-blue-600 transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      Learn more
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Additional Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 grid md:grid-cols-3 gap-6"
          >
            {[
              { icon: Shield, title: 'Enterprise Security', description: 'SOC 2 compliant with end-to-end encryption' },
              { icon: Globe, title: 'Global Infrastructure', description: '99.9% uptime SLA with multi-region support' },
              { icon: Terminal, title: 'CLI Tools', description: 'Powerful command-line tools for automation' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border border-gray-200 hover:shadow-lg transition-all p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '10K+', label: 'Active Devices' },
              { value: '500+', label: 'Developers' },
              { value: '99.9%', label: 'Uptime' },
              { value: '1M+', label: 'Events/Day' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200 px-4 py-1.5">
              Per-Workspace Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Workspace Plan
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Your account is free. Pay only for workspace features as you grow.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> Create unlimited free workspaces. Upgrade individual workspaces when you need more devices, features, or team collaboration.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Starter',
                price: '$0',
                description: 'Perfect for hobbyists and small projects',
                features: ['5 devices', '3 automation rules', '250K API requests/mo', '7 days retention', '100 MB storage', '1 team member', 'Community support'],
                cta: 'Get Started Free',
                popular: false,
              },
              {
                name: 'Professional',
                price: '$29',
                description: 'For growing teams and production',
                features: ['50 devices', '50 automation rules', '2.5M API requests/mo', '90 days retention', '5 GB storage', '5 team members', 'Email support', 'Webhooks'],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Business',
                price: '$99',
                description: 'For demanding IoT deployments',
                features: ['250 devices', '500 automation rules', '12M API requests/mo', '1 year retention', '25 GB storage', '20 team members', 'Priority support', 'Advanced analytics'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Enterprise',
                price: '$299',
                description: 'For large-scale production',
                features: ['1,000+ devices', 'Unlimited rules', '50M+ API requests/mo', 'Custom retention', '100 GB storage', 'Unlimited members', 'Dedicated support', 'SLA guarantee'],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card className={`border-2 ${plan.popular ? 'border-blue-500 shadow-2xl scale-105' : 'border-gray-200'} h-full relative overflow-hidden`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                  )}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      {plan.price !== 'Custom' && <span className="text-gray-600">/month</span>}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-center gap-2 text-sm text-gray-700">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <CheckCircle className={`w-3 h-3 ${plan.popular ? 'text-blue-600' : 'text-green-600'}`} />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full h-11 text-sm ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => {
                        if (plan.cta === 'Contact Sales') {
                          router.push('/contact');
                        } else {
                          handleGetStarted();
                        }
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA to full pricing page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="border-2">
                View Detailed Pricing & Feature Comparison
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              All plans include 14-day free trial • No credit card required • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* API Preview Section */}
      <section id="api" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-1.5">
              Developer API
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Built for Developers
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Comprehensive REST API with detailed documentation and code examples
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid lg:grid-cols-2 gap-8 items-start"
          >
            {/* Code Example with Language Switcher */}
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <CardContent className="p-0">
                {/* Header with language switcher */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-mono text-gray-400">POST /api/v1/devices</span>
                  </div>

                  {/* Language Tabs */}
                  <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
                    {[
                      { key: 'javascript', label: 'JavaScript' },
                      { key: 'curl', label: 'CURL' },
                      { key: 'esp32', label: 'ESP32' },
                      { key: 'python', label: 'Python' },
                      { key: 'go', label: 'Go' },
                    ].map((lang) => (
                      <button
                        key={lang.key}
                        onClick={() => setSelectedLanguage(lang.key as typeof selectedLanguage)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          selectedLanguage === lang.key
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Display */}
                <div className="p-6 bg-[#1e293b] overflow-x-auto">
                  <pre className="text-sm font-mono leading-relaxed">
                    {selectedLanguage === 'javascript' && (
                      <code className="text-gray-300">
{`const response = await fetch(
  'https://api.thebaycity.dev/v1/devices',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Temperature Sensor',
      type: 'sensor',
      metadata: {
        location: 'Living Room',
        firmware: 'v2.1.0'
      }
    })
  }
);

const device = await response.json();
console.log(device);`}
                      </code>
                    )}

                    {selectedLanguage === 'curl' && (
                      <code className="text-gray-300">
{`curl -X POST https://api.thebaycity.dev/v1/devices \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Temperature Sensor",
    "type": "sensor",
    "metadata": {
      "location": "Living Room",
      "firmware": "v2.1.0"
    }
  }'`}
                      </code>
                    )}

                    {selectedLanguage === 'esp32' && (
                      <code className="text-gray-300">
{`#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void createDevice() {
  HTTPClient http;
  http.begin("https://api.thebaycity.dev/v1/devices");
  http.addHeader("Authorization", "Bearer YOUR_API_KEY");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["name"] = "Temperature Sensor";
  doc["type"] = "sensor";
  doc["metadata"]["location"] = "Living Room";
  doc["metadata"]["firmware"] = "v2.1.0";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String response = http.getString();

  Serial.println(response);
  http.end();
}`}
                      </code>
                    )}

                    {selectedLanguage === 'python' && (
                      <code className="text-gray-300">
{`import requests
import json

url = "https://api.thebaycity.dev/v1/devices"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "name": "Temperature Sensor",
    "type": "sensor",
    "metadata": {
        "location": "Living Room",
        "firmware": "v2.1.0"
    }
}

response = requests.post(url, headers=headers, json=data)
device = response.json()
print(device)`}
                      </code>
                    )}

                    {selectedLanguage === 'go' && (
                      <code className="text-gray-300">
{`package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func createDevice() {
    url := "https://api.thebaycity.dev/v1/devices"

    payload := map[string]interface{}{
        "name": "Temperature Sensor",
        "type": "sensor",
        "metadata": map[string]string{
            "location": "Living Room",
            "firmware": "v2.1.0",
        },
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    fmt.Println("Device created successfully")
}`}
                      </code>
                    )}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Features List */}
            <div className="space-y-6">
              {[
                { icon: Code, title: 'RESTful API', description: 'Clean, predictable API design following industry standards' },
                { icon: Webhook, title: 'Webhooks', description: 'Real-time event notifications to your endpoints' },
                { icon: Lock, title: 'Secure Authentication', description: 'API key and OAuth 2.0 support with rate limiting' },
                { icon: GitBranch, title: 'SDKs & Libraries', description: 'Official libraries for JavaScript, Python, Go, and more' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-400">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden"
      >
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            Ready to Build Your IoT Platform?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join hundreds of developers building the future of IoT
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl h-12 px-8"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo variant="icon" size="md" className="mb-4" />
              <p className="text-sm">
                The developer-first IoT platform for building and monitoring connected devices.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('api')} className="hover:text-white transition-colors">API Docs</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            &copy; 2026 Thebaycity. Built for IoT developers.
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <Play className="w-6 h-6 text-blue-600" />
              Thebaycity IoT Platform Features
            </DialogTitle>
            <DialogDescription className="sr-only">
              Interactive demo showcasing Thebaycity IoT platform features
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            {/* Custom Carousel */}
            <div className="relative">
              {/* Slides */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                {/* Image Section */}
                <div className="relative h-[400px] overflow-hidden">
                  <img
                    src={demoSlides[currentSlide].image}
                    alt={demoSlides[currentSlide].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                  {/* Overlay Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${demoSlides[currentSlide].color} flex items-center justify-center shadow-lg`}>
                        {React.createElement(demoSlides[currentSlide].icon, { className: 'w-6 h-6 text-white' })}
                      </div>
                      <Badge className={`bg-gradient-to-r ${demoSlides[currentSlide].color} text-white px-3 py-1 text-sm border-0`}>
                        Feature {currentSlide + 1}/{demoSlides.length}
                      </Badge>
                    </div>

                    <h3 className="text-3xl font-bold mb-3">{demoSlides[currentSlide].title}</h3>
                    <p className="text-lg text-gray-200 leading-relaxed max-w-3xl mb-4">
                      {demoSlides[currentSlide].description}
                    </p>

                    {/* Feature highlights */}
                    <div className="flex flex-wrap gap-2">
                      {demoSlides[currentSlide].features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-sm text-white">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={() => setCurrentSlide((prev) => (prev === 0 ? demoSlides.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all z-10"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev === demoSlides.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all z-10"
              >
                <ChevronRight className="w-6 h-6 text-gray-900" />
              </button>

              {/* Dots Indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {demoSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Ready to get started?</p>
                <p className="text-xs text-gray-600">Start your free 14-day trial today</p>
              </div>
              <Button
                onClick={() => {
                  setShowDemoModal(false);
                  handleGetStarted();
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
