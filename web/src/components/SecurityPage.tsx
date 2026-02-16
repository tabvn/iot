"use client";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Shield, Lock, Server, Globe, Eye, KeyRound, AlertTriangle,
  CheckCircle2, ArrowRight, Database, Fingerprint, ShieldCheck, Network,
  Users, Bug, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicPageHeader } from "@/components/PublicPageHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const commitments = [
  {
    title: "Data Protection",
    description: "Your data is encrypted at rest and in transit, with strict tenant isolation at every level.",
    icon: ShieldCheck,
  },
  {
    title: "Access Control",
    description: "Granular role-based permissions ensure only authorized users can access your resources.",
    icon: Lock,
  },
  {
    title: "Infrastructure Security",
    description: "Built on Cloudflare's global edge network with built-in DDoS protection and TLS enforcement.",
    icon: Globe,
  },
  {
    title: "Continuous Improvement",
    description: "We are actively working toward SOC 2 and ISO 27001 certifications as we scale.",
    icon: Zap,
  },
];

const securityFeatures = [
  {
    category: "Data Protection",
    icon: Database,
    color: "from-blue-500 to-blue-600",
    items: [
      {
        title: "Encryption at Rest",
        description: "All data stored in Cloudflare R2 is encrypted at rest. Encryption is handled at the infrastructure level, ensuring data is protected without application overhead.",
      },
      {
        title: "Encryption in Transit",
        description: "All API traffic is encrypted via HTTPS/TLS enforced by Cloudflare. Every connection between clients, devices, and our platform is secured end-to-end.",
      },
      {
        title: "Data Isolation",
        description: "Each workspace operates in a logically isolated environment. Data is partitioned at the storage level using workspace-scoped keys, ensuring strict tenant separation.",
      },
    ],
  },
  {
    category: "Authentication & Access",
    icon: Fingerprint,
    color: "from-purple-500 to-purple-600",
    items: [
      {
        title: "Password Security",
        description: "All passwords are hashed using PBKDF2-SHA256 with 100,000 iterations and per-user random salts. Plaintext passwords are never stored or logged.",
      },
      {
        title: "Role-Based Access Control",
        description: "Granular RBAC with four permission levels: Owner, Admin, Editor, and Viewer. Each role has precisely scoped permissions for devices, automations, and workspace management.",
      },
      {
        title: "API Key Security",
        description: "API keys are hashed with SHA-256 before storage. Keys support workspace-scoped and device-scoped permissions, and can be revoked instantly by administrators.",
      },
      {
        title: "JWT Authentication",
        description: "User sessions use short-lived JSON Web Tokens (24-hour expiry) that are cryptographically signed with HMAC-SHA256 and verified on every request.",
      },
      {
        title: "Invitation-Based Access",
        description: "New members are added through secure, time-limited invitation links. Invitations expire after 7 days and can be revoked at any time by workspace administrators.",
      },
    ],
  },
  {
    category: "Infrastructure Security",
    icon: Server,
    color: "from-green-500 to-green-600",
    items: [
      {
        title: "Edge Computing Architecture",
        description: "Built on Cloudflare Workers, our platform runs at the edge across 300+ data centers worldwide. This eliminates single points of failure and ensures low-latency access globally.",
      },
      {
        title: "DDoS Protection",
        description: "Enterprise-grade DDoS mitigation is built into our Cloudflare infrastructure. Traffic is analyzed and filtered at the edge before reaching application logic.",
      },
      {
        title: "Rate Limiting",
        description: "IP-based rate limiting protects authentication endpoints against brute-force attacks. Per-workspace rate limiting on data ingestion ensures fair resource allocation across plans.",
      },
    ],
  },
  {
    category: "Monitoring & Response",
    icon: Eye,
    color: "from-orange-500 to-orange-600",
    items: [
      {
        title: "Infrastructure Monitoring",
        description: "Cloudflare observability is enabled across all Workers and Durable Objects, providing real-time visibility into platform health, errors, and performance metrics.",
      },
      {
        title: "Incident Response",
        description: "We maintain incident response procedures with defined severity levels. Our team is committed to prompt investigation and transparent communication during security events.",
      },
    ],
  },
];

export function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 pt-20 pb-28">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-green-500/10 text-green-400 border-green-500/20 backdrop-blur-sm px-4 py-1.5 text-sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                Security by Design
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Security is Not an{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Afterthought
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10"
            >
              We built Thebaycity with security at every layer. From password hashing and access controls to
              edge computing and rate limiting, your data and devices are protected by design.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl shadow-xl gap-2">
                  Request Security Review
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="mailto:security@thebay.city">
                <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-xl gap-2">
                  <Bug className="w-4 h-4" />
                  Report a Vulnerability
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 20C960 40 1200 60 1440 40V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Commitments */}
      <section className="container mx-auto px-4 -mt-2 mb-20">
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {commitments.map((item) => (
            <motion.div key={item.title} variants={fadeUp}>
              <Card className="rounded-2xl border-slate-200 h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Security Features */}
      {securityFeatures.map((section, sectionIdx) => (
        <section
          key={section.category}
          className={sectionIdx % 2 === 1 ? "bg-slate-50 border-y border-slate-100" : ""}
        >
          <div className="container mx-auto px-4 py-20">
            <motion.div
              className="max-w-5xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-10">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{section.category}</h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((item) => (
                  <motion.div key={item.title} variants={fadeUp}>
                    <Card className="rounded-2xl border-slate-200 h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                          <h3 className="font-semibold text-slate-900 text-lg">{item.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed pl-9">{item.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* Security Practices */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Our Security Practices</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Security is embedded in our development process and operational culture.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: KeyRound,
                title: "Least Privilege Access",
                description: "Our RBAC system enforces least privilege at every level. Users, API keys, and device tokens are scoped to the minimum permissions required for their function.",
              },
              {
                icon: AlertTriangle,
                title: "Responsible Disclosure",
                description: "We maintain a responsible disclosure program and respond to all security reports within 24 hours. Contact security@thebay.city to report vulnerabilities.",
              },
              {
                icon: Network,
                title: "Secure API Design",
                description: "All API endpoints validate authentication and authorization. Input validation, rate limiting, and proper error handling are applied consistently across all routes.",
              },
              {
                icon: Users,
                title: "Workspace Isolation",
                description: "Every workspace operates independently with its own members, devices, API keys, and automations. Cross-workspace data access is architecturally prevented.",
              },
              {
                icon: Shield,
                title: "Brute-Force Protection",
                description: "IP-based rate limiting on authentication endpoints prevents brute-force attacks on login and signup. Repeated failed attempts are automatically throttled.",
              },
              {
                icon: Bug,
                title: "Dependency Security",
                description: "We maintain a minimal dependency footprint to reduce attack surface. Dependencies are regularly reviewed and updated to address known vulnerabilities.",
              },
            ].map((practice) => (
              <motion.div key={practice.title} variants={fadeUp}>
                <Card className="rounded-2xl border-slate-200 h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                      <practice.icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{practice.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{practice.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Vulnerability Disclosure */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            className="max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Card className="rounded-3xl border-slate-200 overflow-hidden">
                <div className="grid md:grid-cols-5">
                  <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 flex flex-col justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-5">
                      <Bug className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Responsible Disclosure</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      We take security vulnerabilities seriously and appreciate the security research community&apos;s efforts.
                    </p>
                  </div>
                  <div className="md:col-span-3 p-8">
                    <h4 className="font-semibold text-slate-900 mb-4">Reporting a Vulnerability</h4>
                    <div className="space-y-3 mb-6">
                      {[
                        "Email security@thebay.city with a detailed description of the vulnerability.",
                        "Include steps to reproduce, potential impact, and any proof-of-concept code.",
                        "We will acknowledge receipt within 24 hours and provide an initial assessment within 72 hours.",
                        "We request that you give us reasonable time to address the issue before public disclosure.",
                      ].map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
                          </div>
                          <p className="text-sm text-slate-600">{step}</p>
                        </div>
                      ))}
                    </div>
                    <a href="mailto:security@thebay.city">
                      <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2">
                        <Shield className="w-4 h-4" />
                        Report a Vulnerability
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-indigo-950">
        <div className="container mx-auto px-4 py-16 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white mb-4">
              Questions About Security?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-300 mb-8 max-w-lg mx-auto">
              We are happy to discuss our security practices, answer questions, or schedule a security review call with our team.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl shadow-xl gap-2">
                  Contact Us
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="mailto:security@thebay.city">
                <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-xl">
                  Contact Security Team
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 text-center py-6">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Thebaycity. All rights reserved.
        </p>
      </div>
    </div>
  );
}
