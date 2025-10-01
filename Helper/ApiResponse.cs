namespace Elite_Project_Task.Helper
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public string? Message { get; set; }
        public T? Data { get; set; }
        public object? Pagination { get; set; }
    }

}
