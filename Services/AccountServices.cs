using Elite_Project_Task.Data;
using Elite_Project_Task.DTOs;
using Elite_Project_Task.Helper;
using Elite_Project_Task.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Threading.Tasks;

namespace Elite_Project_Task.Services
{
    public class AccountServices : IAccountServices
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        public AccountServices(AppDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }
        public async Task<List<AccountListDTO>> GetAllAccounts()
        {            
            return await _context.Balances.Select(x => new AccountListDTO {AccountId= x.BalanceId, AccountName=x.BalanceName ?? string.Empty }).ToListAsync();
        }
        public async Task<PagedResult<AccountDetailsDto>> GetAccountDetails(
    int balanceId, DateTime fromDate, DateTime toDate, int pageNumber, int pageSize)
        {
            if (pageNumber <= 0) pageNumber = 1;
            if (pageSize <= 0) pageSize = 10;

            var baseQuery = from b in _context.Balances
                            join bh in _context.BalanceHistories on b.BalanceId equals bh.BalanceId
                            where bh.BalanceId == balanceId
                                  && bh.Date >= fromDate
                                  && bh.Date <= toDate
                            select new { b, bh };

            // Count total before pagination
            // Only count on page 1, cache for others
            int totalRecords;
            var cacheKey = $"Count_{balanceId}_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}";

            if (pageNumber == 1)
            {
                totalRecords = await baseQuery.CountAsync();
                _cache.Set(cacheKey, totalRecords, TimeSpan.FromMinutes(5));
            }
            else
            {
                totalRecords = _cache.Get<int>(cacheKey);
                if (totalRecords == 0)
                    totalRecords = await baseQuery.CountAsync();
            }

            var items = await baseQuery
                .AsNoTracking()
                .OrderBy(x => x.bh.Date) // must have stable ordering
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new AccountDetailsDto
                {
                    AccountID = x.b.BalanceId,
                    AccountName = x.b.BalanceName,
                    PreviousBalance = x.bh != null ? x.bh.PrevBalnce : 0,
                    DebitAmount = x.bh != null ? x.bh.Debtor : 0,
                    CreditAmount = x.bh != null ? x.bh.Creditor : 0,
                    FinalBalance = x.bh != null
                        ? (x.b.BalanceType == "D"
                            ? (x.bh.PrevBalnce + x.bh.Debtor - x.bh.Creditor)
                            : (x.bh.PrevBalnce + x.bh.Creditor - x.bh.Debtor))
                        : 0,
                    BalanceHisId = x.bh.BalanceHisId
                })
                .ToListAsync();

            return new PagedResult<AccountDetailsDto>
            {
                Items = items,
                TotalRecords = totalRecords,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }
        public async Task<BalanceHistory?> GetTransactionDetails(long transactionId)
        {            
            return await _context.BalanceHistories.FirstOrDefaultAsync(bh => bh.BalanceHisId == transactionId);
        }
    }
}
