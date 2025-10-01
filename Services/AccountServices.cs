using Elite_Project_Task.Data;
using Elite_Project_Task.DTOs;
using Elite_Project_Task.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace Elite_Project_Task.Services
{
    public class AccountServices : IAccountServices
    {
        private readonly AppDbContext _context;

        public AccountServices(AppDbContext context)
        {
            _context = context;
        }
        public async Task<List<AccountListDTO>> GetAllAccounts()
        {            
            return await _context.Balances.Select(x => new AccountListDTO {AccountId= x.BalanceId, AccountName=x.BalanceName ?? string.Empty }).ToListAsync();
        }
        public async Task<List<AccountDetailsDto>> GetAccountDetails(int balanceId, DateTime fromDate, DateTime toDate)
        {
            // Implementation for fetching account details
            var query = from b in _context.Balances
                        join bh in _context.BalanceHistories on b.BalanceId equals bh.BalanceId
                        where bh.BalanceId==balanceId&& bh.Date >= fromDate && bh.Date <= toDate
                        select new AccountDetailsDto
                        {
                            AccountID = b.BalanceId,
                            AccountName = b.BalanceName,
                            PreviousBalance = bh != null ? bh.PrevBalnce : 0,
                            DebitAmount = bh != null ? bh.Debtor : 0,
                            CreditAmount = bh != null ? bh.Creditor : 0,
                            FinalBalance = bh != null
                                ? (b.BalanceType == "D"
                                    ? (bh.PrevBalnce + bh.Debtor - bh.Creditor)
                                    : (bh.PrevBalnce + bh.Creditor - bh.Debtor)) : 0,
                            BalanceHisId = bh.BalanceHisId
                        };                      

            var result = await query.ToListAsync();
              return result;
        }
        public async Task<BalanceHistory?> GetTransactionDetails(long transactionId)
        {            
            return await _context.BalanceHistories.FirstOrDefaultAsync(bh => bh.BalanceHisId == transactionId);
        }
    }
}
