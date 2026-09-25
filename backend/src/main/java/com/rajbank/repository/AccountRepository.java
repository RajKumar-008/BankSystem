package com.rajbank.repository;

import com.rajbank.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    // Spring Data JPA automatically provides methods like save(), findById(), etc.
}
