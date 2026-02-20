"use client";

import { Buffer } from "buffer";

if (typeof window !== "undefined") {
    if (!window.Buffer) {
        (window as any).Buffer = Buffer;
    }
}
