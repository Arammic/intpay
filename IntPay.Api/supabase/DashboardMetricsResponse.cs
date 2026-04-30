namespace IntPay.Api.supabase;

/// <summary>Dashboard-style aggregates for a user (creator or receiver on any linked intent).</summary>
public sealed class DashboardMetricsResponse
{
    public int UserId { get; set; }

    /// <summary>Sum of approved tap simulation amounts across all of the user&apos;s cards.</summary>
    public decimal TotalSpentApproved { get; set; }

    /// <summary>Sum of original intent principal (one row per intent) for intents linked to the user.</summary>
    public decimal TotalIntentPrincipal { get; set; }

    /// <summary>Sum of remaining balances across those intents.</summary>
    public decimal TotalRemainingAcrossIntents { get; set; }

    public int DistinctIntentCount { get; set; }
    public int DistinctCardCount { get; set; }
}
