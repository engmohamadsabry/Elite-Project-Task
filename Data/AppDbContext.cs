using System;
using System.Collections.Generic;
using Elite_Project_Task.Models;
using Microsoft.EntityFrameworkCore;

namespace Elite_Project_Task.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Balance> Balances { get; set; }

    public virtual DbSet<BalanceHistory> BalanceHistories { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=DESKTOP-C9GVLPH;Database=elite_erp_23_4_2024;User Id=sa;Password=P@ssw0rd;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Balance>(entity =>
        {
            entity.HasKey(e => e.BalanceId).HasName("PK_Balance_");

            entity.ToTable("Balance");

            entity.Property(e => e.BalanceId).HasColumnName("Balance_ID");
            entity.Property(e => e.AllowPointSystem)
                .HasMaxLength(1)
                .IsUnicode(false)
                .HasDefaultValueSql("((0))")
                .IsFixedLength()
                .HasColumnName("allow_point_system");
            entity.Property(e => e.BLevel)
                .HasMaxLength(1)
                .HasDefaultValueSql("((1))")
                .IsFixedLength()
                .HasColumnName("B_Level");
            entity.Property(e => e.BalanceName).HasColumnName("Balance_Name");
            entity.Property(e => e.BalanceNameEn).HasColumnName("Balance_Name_en");
            entity.Property(e => e.BalanceType)
                .HasMaxLength(1)
                .IsFixedLength()
                .HasColumnName("Balance_Type");
            entity.Property(e => e.Fixed)
                .HasMaxLength(1)
                .IsFixedLength();
            entity.Property(e => e.OprKindD)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength()
                .HasColumnName("opr_kind_d");
            entity.Property(e => e.OprMD)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength()
                .HasColumnName("opr_m_d");
            entity.Property(e => e.OprType)
                .HasMaxLength(1)
                .IsUnicode(false)
                .IsFixedLength()
                .HasColumnName("opr_type");
            entity.Property(e => e.OrgId)
                .HasDefaultValue(0)
                .HasColumnName("org_id");
            entity.Property(e => e.ParentCode).HasColumnName("Parent_Code");
            entity.Property(e => e.ParentId)
                .HasDefaultValue(0)
                .HasColumnName("Parent_ID");
            entity.Property(e => e.Sub1Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub1_ID");
            entity.Property(e => e.Sub2Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub2_ID");
            entity.Property(e => e.Sub3Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub3_ID");
            entity.Property(e => e.Sub4Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub4_ID");
            entity.Property(e => e.Sub5Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub5_ID");
            entity.Property(e => e.Sub6Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub6_ID");
            entity.Property(e => e.Sub7Id)
                .HasDefaultValue(0)
                .HasColumnName("Sub7_ID");
        });

        modelBuilder.Entity<BalanceHistory>(entity =>
        {
            entity.HasKey(e => e.BalanceHisId);

            entity.ToTable("Balance_History");

            entity.Property(e => e.BalanceHisId).HasColumnName("Balance_His_ID");
            entity.Property(e => e.BalanceId).HasColumnName("Balance_ID");
            entity.Property(e => e.BillArrange).HasColumnName("bill_arrange");
            entity.Property(e => e.BranchId)
                .HasDefaultValue(0)
                .HasColumnName("branch_id");
            entity.Property(e => e.CostCenterId)
                .HasDefaultValue(0)
                .HasColumnName("cost_center_id");
            entity.Property(e => e.Creditor)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("creditor");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Debtor)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("debtor");
            entity.Property(e => e.Este7kakDate)
                .HasColumnType("datetime")
                .HasColumnName("este7kak_date");
            entity.Property(e => e.InsertDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("insert_date");
            entity.Property(e => e.Kind).HasMaxLength(2);
            entity.Property(e => e.NewBalnce)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("New_Balnce");
            entity.Property(e => e.OrderBill).HasColumnName("Order_Bill");
            entity.Property(e => e.OrgId).HasColumnName("org_id");
            entity.Property(e => e.PrevBalnce)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("Prev_Balnce");
            entity.Property(e => e.ReferenceNo)
                .HasMaxLength(150)
                .HasColumnName("Reference_NO");
            entity.Property(e => e.RequestNo).HasColumnName("Request_NO");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
