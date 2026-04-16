"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { User, CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { SubscriptionTier } from "@/types";

const tierColor: Record<SubscriptionTier, "default" | "info" | "purple" | "warning"> = {
  free: "default",
  starter: "info",
  pro: "purple",
  enterprise: "warning",
};

export default function AccountPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      setFullName(user.user_metadata?.full_name ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      if (profile) setTier(profile.subscription_tier as SubscriptionTier);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const json = await res.json();
    setPortalLoading(false);
    if (json.url) window.location.href = json.url;
  }

  return (
    <div>
      <DashboardHeader title="Account" subtitle="Manage your profile and subscription" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" /> Profile
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
            <Input
              label="Email"
              value={email}
              disabled
              hint="Email cannot be changed here."
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving} size="sm">
                Save changes
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" /> Subscription
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Current plan</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={tierColor[tier]} className="capitalize">
                    {tier}
                  </Badge>
                  {tier === "free" && (
                    <span className="text-xs text-gray-500">5 scans/day</span>
                  )}
                </div>
              </div>
              {tier !== "free" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  loading={portalLoading}
                >
                  Manage billing
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  Upgrade
                </Button>
              )}
            </div>

            {tier === "free" && (
              <p className="text-xs text-gray-500">
                Upgrade to unlock unlimited scans, real-time trending, and AI analysis.
              </p>
            )}
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gray-400" /> Security
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-xs text-gray-500">Last changed: unknown</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.resetPasswordForEmail(email);
                  alert("Password reset email sent!");
                }}
              >
                Reset password
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
