namespace IntPay.Api.supabase;

public record HomeSummaryResponse
{
    // Financial Overview
    public decimal FreeMoney { get; init; }
    public decimal LockMoney { get; init; }
    public int TotalActivityCount { get; init; }

    // Categorized Card Sliders
    public CardSection SelfCards { get; init; } = new();
    public CardSection ReceivedCards { get; init; } = new();
    public CardSection SentCards { get; init; } = new();
}

public record CardSection
{
    public List<IntentWithCardResponse> Items { get; init; } = new();
    public int Count => Items.Count;
}