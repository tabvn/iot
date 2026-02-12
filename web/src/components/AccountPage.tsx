"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import useSWRMutation from "swr/mutation";
import { User, Key, Shield, Bell, Camera, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiUpdateUser } from "@/lib/api";
import { useEffect, useState } from "react";
import {cn} from "@/components/ui/utils";

interface AccountFormValues {
  name: string;
  email: string;
}

export function AccountPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<AccountFormValues>({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  // Re-sync form defaults when user changes (e.g. after refetch)
  useEffect(() => {
    reset({
      name: user?.name || "",
      email: user?.email || "",
    });
    setAvatarUrl(user?.avatarUrl || "");
  }, [user, reset]);

  // SWR mutation for updating user
  const { trigger: mutateUser, isMutating, error: isError } = useSWRMutation(
    token && user ? ["user", user.id] : null,
    async (_key, { arg }: { arg: AccountFormValues }) => {
      if (!token || !user) throw new Error("Not authenticated");
      const updated = await apiUpdateUser(token, user.id, { name: arg.name, email: arg.email });
      if (setUser) {
        setUser({ ...user, name: updated.name, email: updated.email, avatarUrl: updated.avatarUrl });
      }
      return updated;
    }
  );

  const onSubmit = async (values: AccountFormValues) => {
    if (!user || !token) return;
    try {
      await mutateUser(values);
      toast.success("Account settings saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save account settings");
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !token) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE}/users/${user.id}/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to upload avatar");
      }
      const data = (await res.json()) as { avatarUrl: string };
      setAvatarUrl(data.avatarUrl);
      if (setUser) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err?.message || "Avatar upload failed");
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-1">Manage your personal account settings</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${avatarUrl}`}
                    alt={user?.name || "Avatar"}
                    className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {initials}
                  </div>
                )}
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 bg-white shadow-md"
                  asChild
                >
                  <label className="cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </Button>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user?.name || "User"}</h3>
                <p className="text-sm text-gray-500">{user?.email || "user@example.com"}</p>
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...register("email")} className={
                    cn("h-11", isError ? "border-red-500" : "")
                  } />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isMutating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-70"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting || isMutating ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">Add an extra layer of security</p>
              </div>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Change Password</Label>
                <p className="text-sm text-gray-500">Update your password regularly</p>
              </div>
              <Button variant="outline" className="gap-2">
                <Key className="w-4 h-4" />
                Change
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive alerts about device status and updates</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
