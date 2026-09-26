package com.rajbank.repository;

import com.rajbank.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {
    List<Loan> findByAccountNumberOrderByAppliedAtDesc(String accountNumber);
    List<Loan> findByStatusOrderByAppliedAtDesc(String status);
}
