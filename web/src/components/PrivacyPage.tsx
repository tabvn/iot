"use client";
import Link from "next/link";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Database, Globe, Info, CheckCircle2 } from "lucide-react";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <PublicPageHeader />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-2 text-sm font-semibold mb-4">
            <Shield className="w-4 h-4" />
            Privacy Policy
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: February 1, 2026
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8 border-purple-200 bg-purple-50">
          <Info className="w-5 h-5 text-purple-600" />
          <AlertDescription className="text-purple-900 ml-2">
            <strong>Your Privacy Matters:</strong> Thebaycity is committed to protecting your personal information and your right to privacy.
          </AlertDescription>
        </Alert>

        {/* Privacy Content */}
        <div className="space-y-6">
          {/* 1. Information We Collect */}
          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  1
                </div>
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 leading-relaxed">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  Personal Information
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name and email address</li>
                  <li>Company or organization name</li>
                  <li>Account credentials (securely hashed)</li>
                  <li>Payment and billing information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  Device and IoT Data
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Device identifiers and metadata</li>
                  <li>Sensor readings and telemetry data</li>
                  <li>Device status and connectivity information</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 2. How We Use Your Information */}
          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  2
                </div>
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700 leading-relaxed">
              <p>We use the information we collect for the following purposes:</p>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Service Delivery:</strong> To provide, maintain, and improve our IoT platform services.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Account Management:</strong> To create and manage your account and provide customer support.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Security:</strong> To detect, prevent, and address fraud, security issues, and technical problems.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Data Storage and Security */}
          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
                Data Storage and Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 leading-relaxed">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  Security Measures
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>All data transmitted via HTTPS/TLS encryption</li>
                  <li>Password hashing using bcrypt with salt</li>
                  <li>API authentication using secure API keys</li>
                  <li>Regular security audits and vulnerability assessments</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-2 shadow-md bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Info className="w-8 h-8 text-purple-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <div className="space-y-1">
                <p><strong>Email:</strong> <a href="mailto:privacy@thebaycity.dev" className="text-purple-600 hover:underline">privacy@thebaycity.dev</a></p>
                <p><strong>Support:</strong> <Link href="/contact" className="text-purple-600 hover:underline">Contact Support</Link></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
