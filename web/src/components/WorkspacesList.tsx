"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Folder, Settings, TrendingUp, Wifi, Calendar, Check, X, Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiListWorkspaces, apiCreateWorkspace, apiCheckSlugAvailable, type WorkspaceDetail } from "@/lib/api";
import { toast } from "sonner";


function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const RESERVED_SLUGS = [
  "home",
  "blog",
  "contact",
  "dashboard",
  "developer",
  "forgot-password",
  "login",
  "pricing",
  "privacy",
  "reset-password",
  "signup",
  "terms",
  "actions",
  "api",
  "types",
  "settings",
  "account",
  "figma",
  "components",
  "lib",
  "styles",
  "utils",
];

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(64, "Name must be 64 characters or less"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(64, "Slug must be 64 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens")
    .refine((slug) => !RESERVED_SLUGS.includes(slug), {
      message: "This is a reserved name and cannot be used.",
    }),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
});

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;

export function WorkspacesList() {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Slug availability state
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugCheckAbort = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Load workspaces
  useEffect(() => {
    if (authLoading) return;
    if (!token || !user) {
      setLoading(false);
      return;
    }
    apiListWorkspaces(token, user.id)
      .then((res) => setWorkspaces(res.workspaces))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user, authLoading]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setValue("slug", nameToSlug(watchedName), { shouldValidate: watchedName.length > 0 });
    }
  }, [watchedName, slugManuallyEdited, setValue]);

  // Debounced slug availability check
  const checkSlug = useCallback((slug: string) => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (slugCheckAbort.current) slugCheckAbort.current.abort();

    if (!slug || slug.length < 3 || RESERVED_SLUGS.includes(slug)) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const available = await apiCheckSlugAvailable(slug);
        setSlugStatus(available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
  }, []);

  // Re-check when slug changes
  useEffect(() => {
    checkSlug(watchedSlug);
    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [watchedSlug, checkSlug]);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!slugManuallyEdited) {
      setValue("slug", nameToSlug(name), { shouldValidate: name.length > 0 });
    }
  };

  const onSubmit = async (values: CreateWorkspaceFormValues) => {
    if (!token || slugStatus === "taken" || RESERVED_SLUGS.includes(values.slug)) return;
    setCreating(true);
    try {
      const created = await apiCreateWorkspace(token, {
        name: values.name,
        slug: values.slug,
        description: values.description || undefined,
      });
      setWorkspaces((prev) => [...prev, created]);
      setOpen(false);
      reset();
      setSlugManuallyEdited(false);
      setSlugStatus("idle");
      toast.success("Workspace created!");
      router.push(`/${created.slug}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset();
      setSlugManuallyEdited(false);
      setSlugStatus("idle");
    }
  };

  const totalDevices = 0;
  const onlineDevices = 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm">
                <TrendingUp className="w-4 h-4" />
                All Systems Operational
              </div>
              <h2 className="text-4xl font-bold">Your Workspaces</h2>
              <p className="text-blue-100 text-lg max-w-2xl">
                Manage and monitor your IoT devices across multiple workspaces with real-time insights.
              </p>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{workspaces.length}</div>
                    <div className="text-sm text-blue-100">Workspaces</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalDevices}</div>
                    <div className="text-sm text-blue-100">Total Devices</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-2">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{onlineDevices}</div>
                    <div className="text-sm text-blue-100">Online Now</div>
                  </div>
                </div>
              </div>
            </div>
            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl">
                  <Plus className="w-5 h-5 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Create New Workspace</DialogTitle>
                  <DialogDescription className="text-base">
                    Organize your IoT devices into dedicated workspaces for better management.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="ws-name" className="text-base">Workspace Name</Label>
                    <Input
                      id="ws-name"
                      placeholder="e.g., Smart Home, Office Building"
                      className="h-11"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws-slug" className="text-base">
                      Slug (URL identifier)
                    </Label>
                    <div className="relative">
                      <Input
                        id="ws-slug"
                        placeholder="e.g., smart-home"
                        className={`h-11 pr-10 font-mono text-sm ${
                          slugStatus === "taken"
                            ? "border-red-400 focus-visible:ring-red-300"
                            : slugStatus === "available"
                              ? "border-green-400 focus-visible:ring-green-300"
                              : ""
                        }`}
                        {...register("slug", {
                          onChange: () => setSlugManuallyEdited(true),
                        })}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === "checking" && (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {slugStatus === "available" && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {slugStatus === "taken" && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {errors.slug && (
                      <p className="text-xs text-red-600">{errors.slug.message}</p>
                    )}
                    {!errors.slug && slugStatus === "taken" && (
                      <p className="text-xs text-red-600">This slug is already taken</p>
                    )}
                    {!errors.slug && slugStatus === "available" && (
                      <p className="text-xs text-green-600">Slug is available</p>
                    )}
                    {!errors.slug && RESERVED_SLUGS.includes(watchedSlug) && (
                      <p className="text-xs text-red-600">This is a reserved name and cannot be used.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws-description" className="text-base">
                      Description <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="ws-description"
                      placeholder="Brief description of this workspace"
                      className="min-h-24"
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-600">{errors.description.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating || slugStatus === "taken" || slugStatus === "checking" || RESERVED_SLUGS.includes(watchedSlug)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Workspace"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Workspaces Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No workspaces yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first workspace to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Link key={workspace.workspaceId} href={`/${workspace.slug || workspace.workspaceId}`}>
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative bg-gradient-to-br from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg">
                        <Folder className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <Settings className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">{workspace.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{workspace.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                      0 Devices
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Created {new Date(workspace.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
