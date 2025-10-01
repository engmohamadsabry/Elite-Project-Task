using Elite_Project_Task.DTOs;
using Elite_Project_Task.Helper;
using Elite_Project_Task.Models;

namespace Elite_Project_Task.Services
{
    public interface IAccountServices
    {
        Task<PagedResult<AccountDetailsDto>> GetAccountDetails( int balanceId, DateTime fromDate, DateTime toDate, int pageNumber, int pageSize);
        Task<List<AccountListDTO>> GetAllAccounts();
        Task<BalanceHistory?> GetTransactionDetails(long transactionId);
    }
}