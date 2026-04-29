namespace IntPay.Api.supabase
{
    public record TapToPayRequest(string CardNumber, decimal Amount, string MerchantName, string Mcc, string City, string Country);

}
