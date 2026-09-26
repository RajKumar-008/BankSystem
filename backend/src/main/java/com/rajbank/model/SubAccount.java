package com.rajbank.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sub_accounts")
public class SubAccount {

    @Id
    private String accountNumber; // The actual generated account number for this specific sub-account

    private String parentAccountNumber; // Links to the main Account
    private String accountType; // "Savings", "Current", "Business"
    private Double balance;
    private LocalDateTime createdAt;

    public SubAccount() {}

    public SubAccount(String accountNumber, String parentAccountNumber, String accountType, Double balance) {
        this.accountNumber = accountNumber;
        this.parentAccountNumber = parentAccountNumber;
        this.accountType = accountType;
        this.balance = balance;
        this.createdAt = LocalDateTime.now();
    }

    public String getAccountNumber() { return accountNumber; }
    public String getParentAccountNumber() { return parentAccountNumber; }
    public String getAccountType() { return accountType; }
    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
