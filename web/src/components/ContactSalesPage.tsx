"use client";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Mail, Phone, MapPin, Send, CheckCircle, Building2, Users, Globe, Zap,
  MessageSquare, Clock, Shield, Headphones, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { PublicPageHeader } from "@/components/PublicPageHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export function ContactSalesPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    teamSize: "",
    devices: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSubmitted(true);
    toast.success("Message sent! We'll get back to you shortly.");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_60%)]" />

        <div className="relative container mx-auto px-4 pt-20 pb-28">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-white/10 text-blue-200 border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                We typically respond within 2 hours
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Let&apos;s Build Something{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Great Together
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto"
            >
              Whether you&apos;re exploring IoT for the first time or scaling an enterprise deployment,
              our team is here to help you every step of the way.
            </motion.p>
          </motion.div>
        </div>

        {/* Curved divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 20C960 40 1200 60 1440 40V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="container mx-auto px-4 -mt-2 mb-16">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {[
            { icon: Clock, label: "< 2h Response", desc: "Average reply time" },
            { icon: Shield, label: "Enterprise Ready", desc: "SOC 2 compliant" },
            { icon: Headphones, label: "24/7 Support", desc: "For enterprise plans" },
            { icon: Globe, label: "Global Scale", desc: "Multi-region deploy" },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              className="text-center p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Main content */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">

          {/* Left column — Form */}
          <motion.div
            className="lg:col-span-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
          >
            <Card className="border border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Get in Touch
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Fill out the form and our team will reach out within 24 hours
                </p>
              </div>

              <CardContent className="p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", email: "", company: "", phone: "", teamSize: "", devices: "", subject: "", message: "" });
                      }}
                    >
                      Send Another Message
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="John Smith"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                          className="h-11 rounded-xl border-slate-200 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Work Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          required
                          className="h-11 rounded-xl border-slate-200 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                          Company <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="company"
                          placeholder="Acme Inc"
                          value={formData.company}
                          onChange={(e) => handleChange("company", e.target.value)}
                          required
                          className="h-11 rounded-xl border-slate-200 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          className="h-11 rounded-xl border-slate-200 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="teamSize" className="text-sm font-medium text-slate-700">
                          Team Size
                        </Label>
                        <Select value={formData.teamSize} onValueChange={(v) => handleChange("teamSize", v)}>
                          <SelectTrigger id="teamSize" className="h-11 rounded-xl border-slate-200">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1 - 10 people</SelectItem>
                            <SelectItem value="11-50">11 - 50 people</SelectItem>
                            <SelectItem value="51-200">51 - 200 people</SelectItem>
                            <SelectItem value="201-1000">201 - 1,000 people</SelectItem>
                            <SelectItem value="1000+">1,000+ people</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="devices" className="text-sm font-medium text-slate-700">
                          Expected Devices
                        </Label>
                        <Select value={formData.devices} onValueChange={(v) => handleChange("devices", v)}>
                          <SelectTrigger id="devices" className="h-11 rounded-xl border-slate-200">
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-100">1 - 100 devices</SelectItem>
                            <SelectItem value="100-500">100 - 500 devices</SelectItem>
                            <SelectItem value="500-1000">500 - 1,000 devices</SelectItem>
                            <SelectItem value="1000-5000">1,000 - 5,000 devices</SelectItem>
                            <SelectItem value="5000+">5,000+ devices</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium text-slate-700">
                        Subject <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.subject} onValueChange={(v) => handleChange("subject", v)}>
                        <SelectTrigger id="subject" className="h-11 rounded-xl border-slate-200">
                          <SelectValue placeholder="What can we help you with?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo">Request a Demo</SelectItem>
                          <SelectItem value="pricing">Pricing & Plans</SelectItem>
                          <SelectItem value="enterprise">Enterprise Inquiry</SelectItem>
                          <SelectItem value="technical">Technical Question</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                        Message <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your project, requirements, or any questions you have..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        className="rounded-xl border-slate-200 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={sending}
                      className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Message
                        </span>
                      )}
                    </Button>

                    <p className="text-xs text-slate-500 text-center">
                      By submitting, you agree to our{" "}
                      <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link>
                      {" "}and{" "}
                      <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right column — Info */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {/* How it works */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-3xl border-slate-200 overflow-hidden">
                <div className="px-6 pt-6 pb-2">
                  <h3 className="font-bold text-lg text-slate-900">What Happens Next</h3>
                </div>
                <CardContent className="px-6 pb-6 space-y-5">
                  {[
                    { step: "1", title: "We Review", desc: "Our team reviews your message and matches you with the right specialist.", time: "Within 2 hours" },
                    { step: "2", title: "Discovery Call", desc: "A 30-minute call to understand your goals, requirements, and timeline.", time: "Within 24 hours" },
                    { step: "3", title: "Custom Proposal", desc: "Receive a tailored solution with pricing, implementation plan, and timeline.", time: "Within 48 hours" },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                          {item.step}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-slate-900 text-sm">{item.title}</h4>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.time}</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Enterprise features */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-3xl border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">Enterprise Features</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Users, text: "Unlimited team members & workspaces" },
                      { icon: Zap, text: "10,000+ req/min with priority routing" },
                      { icon: Globe, text: "Multi-region deployment & data residency" },
                      { icon: Shield, text: "SSO, audit logs & compliance tools" },
                      { icon: Building2, text: "Dedicated account manager & SLA" },
                      { icon: Headphones, text: "24/7 priority support with < 1h SLA" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-blue-300" />
                        </div>
                        <span className="text-sm text-slate-200">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Link href="/pricing">
                      <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10 rounded-xl gap-2">
                        View All Plans
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact info */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-3xl border-slate-200 overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-lg text-slate-900">Other Ways to Reach Us</h3>
                  <div className="space-y-4">
                    <a href="mailto:sales@thebay.city" className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Email Us</div>
                        <div className="text-sm text-blue-600 group-hover:underline">sales@thebay.city</div>
                      </div>
                    </a>
                    <a href="tel:+15551234567" className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Call Us</div>
                        <div className="text-sm text-green-600 group-hover:underline">+1 (555) 123-4567</div>
                      </div>
                    </a>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Visit Us</div>
                        <div className="text-sm text-slate-500">123 IoT Street, San Francisco, CA 94105</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            className="max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
              <p className="text-slate-600">Quick answers to common questions</p>
            </motion.div>

            <div className="space-y-4">
              {[
                {
                  q: "How quickly can I get started?",
                  a: "You can sign up and start connecting devices in minutes with our Starter plan. For enterprise deployments, our team will work with you on a custom onboarding timeline.",
                },
                {
                  q: "Do you offer a free trial?",
                  a: "Yes! Our Starter plan is free to get started. You can explore the platform, connect devices, and test automations before committing to a paid plan.",
                },
                {
                  q: "What kind of support do you offer?",
                  a: "All plans include community support and documentation. Professional plans get priority email support, and Enterprise plans include 24/7 dedicated support with guaranteed SLAs.",
                },
                {
                  q: "Can I migrate from another IoT platform?",
                  a: "Absolutely. Our team has experience migrating workloads from all major IoT platforms. We provide migration tooling and hands-on support to ensure a smooth transition.",
                },
              ].map((item) => (
                <motion.div
                  key={item.q}
                  variants={fadeUp}
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                >
                  <h4 className="font-semibold text-slate-900 mb-2">{item.q}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 py-16 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-blue-100 mb-8 max-w-lg mx-auto">
              Join thousands of teams already building with Thebaycity. Start free, scale when you&apos;re ready.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-xl gap-2">
                  Start for Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 rounded-xl">
                  View Pricing
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer note */}
      <div className="bg-slate-900 text-center py-6">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Thebaycity. All rights reserved.
        </p>
      </div>
    </div>
  );
}
