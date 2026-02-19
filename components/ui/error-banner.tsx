"use client";

import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

interface ErrorBannerProps {
    message: string;
    onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-md">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{message}</span>
                <button
                    onClick={() => {
                        setVisible(false);
                        onDismiss?.();
                    }}
                    className="ml-2 p-1 hover:bg-destructive/20 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
