"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Github, CheckCircle } from 'lucide-react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agreeToTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: "You must agree to the Terms and Privacy Policy",
    }),
});

type SignUpFormValues = z.infer<typeof signupSchema>;

export function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get email and returnUrl from search params
  const prefillEmail = searchParams.get('email') || '';
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: prefillEmail,
      password: "",
      agreeToTerms: false,
    },
  });

  // Set email value when it changes
  useEffect(() => {
    if (prefillEmail) {
      setValue('email', prefillEmail);
    }
  }, [prefillEmail, setValue]);

  const onSignUp = async (values: SignUpFormValues) => {
    setLoading(true);
    try {
      await signup(values.name, values.email, values.password);
      toast.success('Account created, redirecting...');
      router.push(returnUrl);
    } catch (error: any) {
      toast.error(error?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = (provider: string) => {
    toast.success(`${provider} sign up coming soon!`);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo variant="icon" size="xl" />
          </div>

          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl sm:text-3xl">Get Started Free</CardTitle>
              <CardDescription>Create your Thebaycity account in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Social Sign Up */}
              <div className="space-y-3 mb-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialSignUp('Google')}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialSignUp('GitHub')}
                >
                  <Github className="w-5 h-5 mr-2" />
                  Continue with GitHub
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                </div>
              </div>

              {/* Sign Up Form */}
              <form onSubmit={handleSubmit(onSignUp)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="John Smith"
                      className="pl-10 h-11"
                      {...register("name")}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-11"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    {...register("agreeToTerms")}
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="mt-1 text-xs text-red-600">{errors.agreeToTerms.message}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              14-day free trial
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              No credit card
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
