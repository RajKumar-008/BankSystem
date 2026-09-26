package com.rajbank.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "loans")
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String accountNumber;
    private String type; // "Home Loan", "Personal Loan"
    private Double amount;
    private Double emi;
    private String status; // "PENDING", "APPROVED", "REJECTED"
    private LocalDateTime appliedAt;

    public Loan() {}

    public Loan(String accountNumber, String type, Double amount, Double emi) {
        this.accountNumber = accountNumber;
        this.type = type;
        this.amount = amount;
        this.emi = emi;
        this.status = "PENDING";
        this.appliedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getAccountNumber() { return accountNumber; }
    public String getType() { return type; }
    public Double getAmount() { return amount; }
    public Double getEmi() { return emi; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
}
