"use client";
import React from 'react';
import { CreditCard, Crown, Sparkles, Check, ArrowRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiUpdatePlan, type WorkspacePlan, type BillingInvoice } from '@/lib/api';
import { mutate } from 'swr';

const plans = [
  {
    id: 'starter' as WorkspacePlan,
    name: 'Starter',
    price: 0,
    features: [
      '5 devices',
      '250K API requests/mo',
      '7 days retention',
      '100 MB storage',
      '3 automation rules',
      '1 team member',
      'Community support',
    ],
  },
  {
    id: 'professional' as WorkspacePlan,
    name: 'Professional',
    price: 29,
    popular: true,
    features: [
      '50 devices',
      '2.5M API requests/mo',
      '90 days retention',
      '5 GB storage',
      '50 automation rules',
      '5 team members',
      'Email support',
    ],
  },
  {
    id: 'business' as WorkspacePlan,
    name: 'Business',
    price: 99,
    features: [
      '250 devices',
      '12M API requests/mo',
      '1 year retention',
      '25 GB storage',
      '500 automation rules',
      '20 team members',
      'Priority support',
    ],
  },
  {
    id: 'enterprise' as WorkspacePlan,
    name: 'Enterprise',
    price: 299,
    features: [
      '1,000+ devices',
      '50M+ API requests/mo',
      'Custom retention',
      '100 GB storage',
      'Unlimited rules',
      'Unlimited members',
      'Dedicated support',
    ],
  },
];

interface BillingSettingsProps {
  currentPlan: WorkspacePlan;
  invoices: BillingInvoice[];
  token: string | null;
  workspaceSlug: string;
}

interface DialogStates {
  upgrade: { open: boolean; planId: WorkspacePlan | null };
  downgrade: { open: boolean; planId: WorkspacePlan | null };
}

export function BillingSettings({
  currentPlan,
  invoices,
  token,
  workspaceSlug,
}: BillingSettingsProps) {
  const [dialogs, setDialogs] = React.useState<DialogStates>({
    upgrade: { open: false, planId: null },
    downgrade: { open: false, planId: null },
  });
  const [isLoading, setIsLoading] = React.useState(false);

  const canUpgrade = (planId: WorkspacePlan) => {
    const planOrder: WorkspacePlan[] = ['starter', 'professional', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex > currentIndex;
  };

  const canDowngrade = (planId: WorkspacePlan) => {
    const planOrder: WorkspacePlan[] = ['starter', 'professional', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex < currentIndex;
  };

  const handleUpgrade = (planId: WorkspacePlan) => {
    setDialogs((prev) => ({
      ...prev,
      upgrade: { open: true, planId },
    }));
  };

  const handleDowngrade = (planId: WorkspacePlan) => {
    setDialogs((prev) => ({
      ...prev,
      downgrade: { open: true, planId },
    }));
  };

  const confirmAction = async (type: 'upgrade' | 'downgrade') => {
    const planId = dialogs[type].planId;
    if (!token || !planId) return;

    setIsLoading(true);
    try {
      await apiUpdatePlan(token, workspaceSlug, planId);
      toast.success(
        type === 'upgrade'
          ? `Successfully upgraded to ${planId}!`
          : 'Downgrade scheduled. Changes take effect at end of billing period.'
      );
      setDialogs((prev) => ({
        ...prev,
        [type]: { open: false, planId: null },
      }));
      mutate(`plan-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${type} plan`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm text-blue-900">
          <strong>Per-Workspace Pricing:</strong> This subscription applies to{' '}
          <strong>this workspace only</strong>. Your account is free, and you can create
          unlimited workspaces.
        </p>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          Plans & Pricing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative border-0 shadow-xl bg-white/80 backdrop-blur-sm transition-all hover:scale-105 ${
                  isCurrentPlan
                    ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50/50 to-blue-50/50'
                    : plan.popular
                    ? 'ring-2 ring-blue-500'
                    : ''
                }`}
              >
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                ) : plan.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                ) : null}

                <CardHeader className="border-b pb-3 sm:pb-4 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                    ${plan.price}
                    <span className="text-sm text-gray-600">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 p-4 sm:p-6">
                  <div className="space-y-2 mb-4 sm:mb-6 min-h-[180px] sm:min-h-[200px]">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  {canUpgrade(plan.id) && (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md text-xs sm:text-sm h-9 sm:h-10"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Upgrade
                    </Button>
                  )}
                  {canDowngrade(plan.id) && (
                    <Button
                      onClick={() => handleDowngrade(plan.id)}
                      variant="outline"
                      className="w-full hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10"
                    >
                      Downgrade
                    </Button>
                  )}
                  {isCurrentPlan && (
                    <Button
                      disabled
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white opacity-70 text-xs sm:text-sm h-9 sm:h-10"
                    >
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Active Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No billing history yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div
                  key={invoice.invoiceId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">
                      {invoice.period}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">
                        ${invoice.amount.toFixed(2)}
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog
        open={dialogs.upgrade.open}
        onOpenChange={(open) =>
          setDialogs((prev) => ({
            ...prev,
            upgrade: { ...prev.upgrade, open },
          }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>Confirm your plan upgrade</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You&apos;re about to upgrade to the{' '}
              <strong className="capitalize">{dialogs.upgrade.planId}</strong> plan.
              Changes will take effect immediately.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDialogs((prev) => ({
                  ...prev,
                  upgrade: { open: false, planId: null },
                }))
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction('upgrade')}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Dialog */}
      <Dialog
        open={dialogs.downgrade.open}
        onOpenChange={(open) =>
          setDialogs((prev) => ({
            ...prev,
            downgrade: { ...prev.downgrade, open },
          }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Downgrade Plan</DialogTitle>
            <DialogDescription>Confirm your plan downgrade</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You&apos;re about to downgrade to the{' '}
              <strong className="capitalize">{dialogs.downgrade.planId}</strong> plan.
              Changes will take effect at the end of your current billing period.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDialogs((prev) => ({
                  ...prev,
                  downgrade: { open: false, planId: null },
                }))
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction('downgrade')}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

