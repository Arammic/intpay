namespace IntPay.Api.supabase;

public sealed class UserLatestActivitiesQuery
{
    public int Limit { get; init; } = 50;
    public int Offset { get; init; }
    public string? Decision { get; init; }
    public string? Action { get; init; }
    /// <summary>Maps to audit row business classification: profile | intent | virtual_card | transaction.</summary>
    public string? EntityType { get; init; }
    /// <summary>Normalized outcome: success | failed | info (from <c>audit_logs.status</c> or derived from <c>decision</c>).</summary>
    public string? Outcome { get; init; }
    public int? CardId { get; init; }
    public int? IntentId { get; init; }
    public DateTime? FromUtc { get; init; }
    public DateTime? ToUtc { get; init; }
    public string? Merchant { get; init; }
    public string? Mcc { get; init; }
    public string? City { get; init; }
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public string Role { get; init; } = "all";
    public bool IncludeInfo { get; init; } = true;
}

public sealed class UserLatestActivitiesResponse
{
    public int UserId { get; init; }
    public int Total { get; init; }
    public int Limit { get; init; }
    public int Offset { get; init; }
    public UserLatestActivitiesAppliedFilters Filters { get; init; } = new();
    public UserLatestActivitiesSummary Summary { get; init; } = new();
    public List<UserActivityItem> Items { get; init; } = new();
}

public sealed class UserLatestActivitiesAppliedFilters
{
    public string? Decision { get; init; }
    public string? Action { get; init; }
    public string? EntityType { get; init; }
    public string? Outcome { get; init; }
    public int? CardId { get; init; }
    public int? IntentId { get; init; }
    public DateTime? FromUtc { get; init; }
    public DateTime? ToUtc { get; init; }
    public string? Merchant { get; init; }
    public string? Mcc { get; init; }
    public string? City { get; init; }
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public string Role { get; init; } = "all";
    public bool IncludeInfo { get; init; } = true;
}

public sealed class UserLatestActivitiesSummary
{
    public int ApprovedCount { get; init; }
    public int DeclinedCount { get; init; }
    public int InfoCount { get; init; }
    public decimal ApprovedSpendTotal { get; init; }
    public decimal DeclinedAmountTotal { get; init; }
    public int DistinctCards { get; init; }
    public int DistinctIntents { get; init; }
}

public sealed class UserActivityItem
{
    public int Id { get; init; }
    public int? CardId { get; init; }
    public int? IntentId { get; init; }
    public string? Action { get; init; }
    public string Decision { get; init; } = string.Empty;
    public string? Reason { get; init; }
    public decimal TransactionAmount { get; init; }
    public string? MerchantName { get; init; }
    public string? Mcc { get; init; }
    public string? City { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? OccurredAt { get; init; }

    public int CreatorId { get; init; }
    public int ReceiverId { get; init; }
    public string Role { get; init; } = "all";
    public string? IntentDescription { get; init; }
    public string? Category { get; init; }
    public string? Country { get; init; }
    public decimal IntentAmount { get; init; }
    public decimal RemainingAmount { get; init; }
    public string CardLast4 { get; init; } = string.Empty;
    public string CardStatus { get; init; } = string.Empty;
    public bool IsLockedByPendingInvoice { get; init; }
    public bool IsManuallyFrozen { get; init; }
    public bool IsRequestRefund { get; init; }
    public bool IsSpendBlocked { get; init; }
    public string? SenderName { get; init; }

    public string ActivityType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Subtitle { get; init; } = string.Empty;
    public string Severity { get; init; } = "neutral";
    public string AmountLabel { get; init; } = "$0.00";

    /// <summary>profile | intent | virtual_card | transaction (for filtering and UI grouping).</summary>
    public string? EntityType { get; init; }

    /// <summary>success | failed | info.</summary>
    public string? Outcome { get; init; }
}
