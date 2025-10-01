using Elite_Project_Task.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Elite_Project_Task.API
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAccountServices accountServices;
        public AccountController(IAccountServices accountServices)
        {
            this.accountServices = accountServices;
        }
        [HttpGet]
        public async Task<IActionResult> GetAllAccounts()
        {
            var accounts = await accountServices.GetAllAccounts();
            return Ok(accounts);
        }
        [HttpGet("{balanceId}/{fromDate}/{toDate}")]
        public async Task<IActionResult> GetAccountDetails(int balanceId, DateTime fromDate, DateTime toDate)
        {
            var accountDetails = await accountServices.GetAccountDetails(balanceId, fromDate, toDate);
            return Ok(accountDetails);
        }
        [HttpGet("{transactionId}")]
        public async Task<IActionResult> GetTransactionDetails(long transactionId)
        {
            var transactionDetails = await accountServices.GetTransactionDetails(transactionId);
            return Ok(transactionDetails);
        }
    }
}
