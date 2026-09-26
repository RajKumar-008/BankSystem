package com.rajbank.repository;

import com.rajbank.model.SubAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubAccountRepository extends JpaRepository<SubAccount, String> {
    List<SubAccount> findByParentAccountNumber(String parentAccountNumber);
}
