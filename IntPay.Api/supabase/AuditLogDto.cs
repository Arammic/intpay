namespace IntPay.Api.supabase.Models
{
  public record AuditLogDto
    {
        public int Id { get; init; }
        public int? CardId { get; init; }
        public decimal TransactionAmount { get; init; }
        public string? MerchantName { get; init; }
        public string? Mcc { get; init; }
        public string Decision { get; init; } = string.Empty;
        public string? Reason { get; init; }
        public DateTime CreatedAt { get; init; }
        public string? City { get; init; }
        public string? Country { get; init; } // إذا موجود في الجدول
        public string? ExternalId { get; init; } // إن أضفت حقل للـ idempotency
        public int? EntityId { get; init; }
        public string? Action { get; init; }
        public DateTime? OccurredAt { get; init; }
    }
    public static class AuditLogMapping
  {
    public static AuditLogDto ToDto(this AuditLog src) => new AuditLogDto
    {
      Id = src.Id,
      CardId = src.CardId,
      TransactionAmount = src.TransactionAmount,
      MerchantName = src.MerchantName,
      Mcc = src.Mcc,
      Decision = src.Decision,
      Reason = src.Reason,
      CreatedAt = src.CreatedAt,
      City = src.City,
      EntityId = src.EntityId,
      Action = src.Action,
      OccurredAt = src.OccurredAt,
      // Country و ExternalId: ضعها فقط إذا موجودة فعلاً في نموذج AuditLog
      Country = GetPropertyValue<string?>(src, "Country"),
      ExternalId = GetPropertyValue<string?>(src, "external_id"),
    
    };

    private static T? GetPropertyValue<T>(object obj, string propName)
    {
      var prop = obj.GetType().GetProperty(propName, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
      if (prop == null) return default;
      return (T?)prop.GetValue(obj);
    }
  }
}
