using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models;
[Table("contacts")]
public class Contact : BaseModel
{
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("contact_id")]
    public int ContactId { get; set; }
}