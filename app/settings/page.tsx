"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Bell, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-100">
            Settings & Preferences
          </h1>
          <p className="mt-1 text-slate-500">
            Theme, notifications, and API keys.
          </p>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-[#0ea5e9]">
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-slate-200">Display Preferences</CardTitle>
                  <CardDescription className="text-slate-500 mt-0.5">
                    Theme, number format, and dashboard layout.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Display options will appear here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-[#0ea5e9]">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-slate-200">Notification Settings</CardTitle>
                  <CardDescription className="text-slate-500 mt-0.5">
                    Alerts and email preferences.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Notification options will appear here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-[#0ea5e9]">
                  <Key className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-slate-200">API Keys</CardTitle>
                  <CardDescription className="text-slate-500 mt-0.5">
                    Indexer or RPC keys for enhanced data (optional).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">API key management will appear here.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
