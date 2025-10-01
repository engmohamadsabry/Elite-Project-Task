using Elite_Project_Task.Models;

namespace Elite_Project_Task.DTOs
{
    public class AccountDetailsDto
    {
        public int AccountID { get; set; }
        public string? AccountName { get; set; }
        public decimal? PreviousBalance { get; set; }
        public decimal? DebitAmount { get; set; }
        public decimal? CreditAmount { get; set; }
        public decimal? FinalBalance { get; set; }
        public  long? BalanceHisId { get; set; }
    }
}
