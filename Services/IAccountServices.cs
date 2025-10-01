using Elite_Project_Task.DTOs;
using Elite_Project_Task.Models;

namespace Elite_Project_Task.Services
{
    public interface IAccountServices
    {
        Task<List<AccountDetailsDto>> GetAccountDetails(int balanceId, DateTime fromDate, DateTime toDate);
        Task<List<AccountListDTO>> GetAllAccounts();
        Task<BalanceHistory?> GetTransactionDetails(long transactionId);
    }
}