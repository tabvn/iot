"use client";
import Link from "next/link";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scale, Shield, AlertTriangle, FileText, Info } from "lucide-react";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PublicPageHeader />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-2 text-sm font-semibold mb-4">
            <Scale className="w-4 h-4" />
            Legal Document
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please read these terms and conditions carefully before using Thebaycity IoT Platform
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: February 1, 2026
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8 border-orange-200 bg-orange-50">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-orange-900 ml-2">
            <strong>Important:</strong> By accessing or using Thebaycity IoT Platform, you agree to be bound by these Terms and Conditions.
            If you do not agree to these terms, please do not use our services.
          </AlertDescription>
        </Alert>

        {/* Terms Content */}
        <div className="space-y-6">
          {/* 1. Acceptance of Terms */}
          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  1
                </div>
                Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                These Terms and Conditions constitute a legally binding agreement between you and Thebaycity IoT
                regarding your access to and use of the Thebaycity IoT platform, including our website, API services,
                WebSocket connections, and all related services.
              </p>
            </CardContent>
          </Card>

          {/* 2. Service Description */}
          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                  2
                </div>
                Service Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Thebaycity IoT provides a cloud-based technology platform that enables users to:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Connect and manage Internet of Things (IoT) devices</li>
                <li>Transmit, receive, and store sensor data via REST API and WebSocket connections</li>
                <li>Monitor device status and sensor readings in real-time</li>
                <li>Create automation rules and configure device behaviors</li>
              </ul>
            </CardContent>
          </Card>

          {/* 3. Limitation of Liability */}
          <Card className="border-2 shadow-md border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <Alert className="border-red-300 bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-900 ml-2">
                  <strong>CRITICAL NOTICE:</strong> Please read this section carefully as it limits our liability.
                </AlertDescription>
              </Alert>
              <p>
                Thebaycity IoT provides technology infrastructure only. We do NOT manufacture or supply IoT hardware devices,
                control your physical devices, or guarantee the safety or reliability of connected devices.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-2 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Info className="w-8 h-8 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="space-y-1">
                <p><strong>Email:</strong> <a href="mailto:legal@thebaycity.dev" className="text-blue-600 hover:underline">legal@thebaycity.dev</a></p>
                <p><strong>Support:</strong> <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acknowledgment */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-2">Acknowledgment</h3>
          <p className="text-blue-100 max-w-2xl mx-auto">
            By using Thebaycity IoT Platform, you acknowledge that you have read, understood, and agree to be bound by these
            Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
