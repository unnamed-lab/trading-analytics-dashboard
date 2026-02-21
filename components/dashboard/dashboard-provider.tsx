"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { TradeFilters, TradeRecord } from "@/types";
import { useAllTrades, useFinancialDetails } from "@/hooks/use-trade-queries";
import { TradeAnalyticsCalculator } from "@/services/trade-analytics.service";
import { useTransactionFetcher } from "@/hooks/use-trade-queries";

interface DashboardContextType {
    filters: TradeFilters;
    setFilters: React.Dispatch<React.SetStateAction<TradeFilters>>;
    handleFilterChange: (newFilters: Partial<TradeFilters>) => void;
    handlePeriodChange: (period: string) => void;
    trades: TradeRecord[];
    analytics: any | null; // Replace 'any' with the specific TradeAnalytics report type if exported
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: Error | null;
    refetchTrades: () => void;
    currentPrices: Map<string, number>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [filters, setFilters] = useState<TradeFilters>({
        period: "7D",
    });

    const handleFilterChange = (newFilters: Partial<TradeFilters>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    const handlePeriodChange = (period: string) => {
        setFilters((prev) => ({ ...prev, period }));
    };

    // 1. Centralized Fetch: Only this hook fetches the raw trades from the DB/RPC
    const {
        data: trades = [],
        isLoading: isTradesLoading,
        isFetching: isTradesFetching,
        isError: isTradesError,
        error: tradesError,
        refetch,
    } = useAllTrades({
        enabled: true,
        excludeFees: true, // We want raw trades without fees
        filters, // useAllTrades handles filtering the raw trades efficiently
    });

    // Fetch financial details if needed for full analytics
    const { data: financials, isLoading: isFinLoading } = useFinancialDetails();
    const { fetcher } = useTransactionFetcher();

    // 2. Local State: We maintain prices for analytics
    const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());

    // Fetch prices once when provider mounts
    React.useEffect(() => {
        fetcher?.fetchCurrentPrices().then(setCurrentPrices).catch(console.error);
    }, [fetcher]);

    // 3. Centralized Analytics Computation: Run once when trades/filters change
    const analytics = useMemo(() => {
        if (!trades.length && !financials) return null;
        const calculator = new TradeAnalyticsCalculator(trades, financials);
        return calculator.generateFullReport(currentPrices);
    }, [trades, financials, currentPrices]);

    const value = {
        filters,
        setFilters,
        handleFilterChange,
        handlePeriodChange,
        trades,
        analytics,
        isLoading: isTradesLoading || isFinLoading,
        isFetching: isTradesFetching,
        isError: isTradesError,
        error: tradesError,
        refetchTrades: refetch,
        currentPrices,
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}
