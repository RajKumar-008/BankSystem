package com.rajbank.repository;

import com.rajbank.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByAccountNumberOrderByTimestampDesc(String accountNumber);
    List<Notification> findByAccountNumberAndIsReadFalse(String accountNumber);
}
