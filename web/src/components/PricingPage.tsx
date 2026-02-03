"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Building2, Rocket, Crown, ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PublicPageHeader } from "@/components/PublicPageHeader";

interface PricingTier {
  name: string;
  icon: LucideIcon;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  badgeColor?: string;
  features: {
    name: string;
    included: boolean | string;
  }[];
  limits: {
    devices: string;
    apiRequests: string;
    dataRetention: string;
    storage: string;
  };
  cta: string;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Perfect for hobbyists and small projects",
    features: [
      { name: "5 devices", included: true },
      { name: "Real-time Monitoring", included: true },
      { name: "Basic Analytics", included: true },
      { name: "REST API Access", included: true },
      { name: "WebSocket Real-time", included: true },
      { name: "Email Support", included: false },
    ],
    limits: {
      devices: "5 devices",
      apiRequests: "250K/month",
      dataRetention: "7 days",
      storage: "100 MB",
    },
    cta: "Get Started Free",
  },
  {
    name: "Professional",
    icon: Building2,
    monthlyPrice: 29,
    yearlyPrice: 279,
    description: "For growing teams and production deployments",
    badge: "Popular",
    badgeColor: "bg-blue-500",
    highlighted: true,
    features: [
      { name: "50 devices", included: true },
      { name: "Real-time Monitoring", included: true },
      { name: "Advanced Analytics", included: true },
      { name: "REST API Access", included: true },
      { name: "WebSocket Real-time", included: true },
      { name: "Email Support", included: true },
    ],
    limits: {
      devices: "50 devices",
      apiRequests: "2.5M/month",
      dataRetention: "90 days",
      storage: "5 GB",
    },
    cta: "Start Free Trial",
  },
  {
    name: "Business",
    icon: Rocket,
    monthlyPrice: 99,
    yearlyPrice: 950,
    description: "For businesses with demanding IoT deployments",
    badge: "Best Value",
    badgeColor: "bg-purple-500",
    features: [
      { name: "250 devices", included: true },
      { name: "Real-time Monitoring", included: true },
      { name: "Advanced Analytics", included: true },
      { name: "REST API Access", included: true },
      { name: "WebSocket Real-time", included: true },
      { name: "Priority Support", included: true },
    ],
    limits: {
      devices: "250 devices",
      apiRequests: "12M/month",
      dataRetention: "1 year",
      storage: "25 GB",
    },
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    icon: Crown,
    monthlyPrice: 299,
    yearlyPrice: 2870,
    description: "Custom solutions for large-scale deployments",
    badge: "Custom",
    badgeColor: "bg-gradient-to-r from-yellow-400 to-orange-500",
    features: [
      { name: "1,000+ devices", included: true },
      { name: "Real-time Monitoring", included: true },
      { name: "Advanced Analytics", included: true },
      { name: "REST API Access", included: true },
      { name: "WebSocket Real-time", included: true },
      { name: "Dedicated Support", included: true },
    ],
    limits: {
      devices: "1,000+ devices",
      apiRequests: "50M/month",
      dataRetention: "Custom",
      storage: "100 GB",
    },
    cta: "Contact Sales",
  },
];

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PublicPageHeader />

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
            Per-Workspace Pricing
          </Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Choose the perfect plan for your workspace
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your account is always free. Upgrade workspaces individually as your IoT projects grow.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 p-1 bg-white rounded-full shadow-sm border inline-flex">
            <Label
              htmlFor="billing-toggle"
              className={`px-6 py-2 rounded-full cursor-pointer transition-all ${
                billingCycle === "monthly" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </Label>
            <Label
              htmlFor="billing-toggle"
              className={`px-6 py-2 rounded-full cursor-pointer transition-all ${
                billingCycle === "yearly" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly
              <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">
                Save 20%
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative overflow-hidden transition-all hover:shadow-2xl ${
                tier.highlighted
                  ? "border-2 border-blue-500 shadow-xl scale-105"
                  : "hover:scale-105"
              }`}
            >
              {tier.badge && (
                <div className={`${tier.badgeColor} text-white text-xs font-semibold py-1 px-4 absolute top-4 right-4 rounded-full`}>
                  {tier.badge}
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${tier.highlighted ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <tier.icon className={`w-6 h-6 ${tier.highlighted ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${billingCycle === "monthly" ? tier.monthlyPrice : Math.floor(tier.yearlyPrice / 12)}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  {billingCycle === "yearly" && tier.yearlyPrice > 0 && (
                    <p className="text-sm text-gray-500">
                      ${tier.yearlyPrice}/year (save ${tier.monthlyPrice * 12 - tier.yearlyPrice})
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-semibold text-sm text-gray-700">Usage Limits</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Devices:</span>
                      <span className="font-medium">{tier.limits.devices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Requests:</span>
                      <span className="font-medium">{tier.limits.apiRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Retention:</span>
                      <span className="font-medium">{tier.limits.dataRetention}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span className="font-medium">{tier.limits.storage}</span>
                    </div>
                  </div>
                </div>

                {/* Features (Compact) */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-semibold text-sm text-gray-700">Key Features</h4>
                  <div className="space-y-1">
                    {tier.features.slice(0, 5).map((feature) => (
                      <div key={feature.name} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={feature.included ? "text-gray-700" : "text-gray-400"}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <Link href={tier.name === "Enterprise" ? "/contact" : "/signup"}>
                    {tier.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-xl mb-8 text-blue-100">
                Join thousands of developers building amazing IoT solutions
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/signup">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
