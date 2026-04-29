
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace IntPay.Api.supabase.Models
{

    [Table("profiles")]
    public class Profile : BaseModel
    {
        [PrimaryKey("id", false)]
        public int Id { get; set; }

        [Column("name")]
        public string Name { get; set; }

        [Column("username")]
        public string Username { get; set; }

        [Column("email")]
        public string Email { get; set; }

        [Column("vault_balance")]
        public decimal VaultBalance { get; set; }

        [Column("lock_money")]
        public decimal LockMoney { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
