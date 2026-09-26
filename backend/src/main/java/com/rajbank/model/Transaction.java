package com.rajbank.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String accountNumber;
    private String type; // "Credit" or "Debit"
    private Double amount;
    private Double closingBalance;
    private String description;
    private String referenceNumber;
    private LocalDateTime timestamp;

    public Transaction() {}

    public Transaction(String accountNumber, String type, Double amount, Double closingBalance, String description, String referenceNumber, LocalDateTime timestamp) {
        this.accountNumber = accountNumber;
        this.type = type;
        this.amount = amount;
        this.closingBalance = closingBalance;
        this.description = description;
        this.referenceNumber = referenceNumber;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public String getAccountNumber() { return accountNumber; }
    public String getType() { return type; }
    public Double getAmount() { return amount; }
    public Double getClosingBalance() { return closingBalance; }
    public String getDescription() { return description; }
    public String getReferenceNumber() { return referenceNumber; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
