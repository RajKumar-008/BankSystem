package com.rajbank.controller;

import com.rajbank.model.Account;
import com.rajbank.model.Transaction;
import com.rajbank.model.Notification;
import com.rajbank.model.SubAccount;
import com.rajbank.model.Loan;
import com.rajbank.repository.AccountRepository;
import com.rajbank.repository.TransactionRepository;
import com.rajbank.repository.NotificationRepository;
import com.rajbank.repository.SubAccountRepository;
import com.rajbank.repository.LoanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
@SuppressWarnings("null")
public class ApiController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SubAccountRepository subAccountRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Account account) {
        if (accountRepository.existsById(account.getAccountNumber())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Account number already exists."));
        }

        Account saved = accountRepository.save(account);

        // Record Initial Deposit Transaction
        if (saved.getBalance() != null && saved.getBalance() > 0) {
            String ref = "RAJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Transaction t = new Transaction(saved.getAccountNumber(), "Credit", saved.getBalance(), saved.getBalance(),
                    "Initial Deposit", ref, LocalDateTime.now());
            transactionRepository.save(t);
        }

        notificationRepository
                .save(new Notification(saved.getAccountNumber(), "Welcome to RAJ Premium Banking!", "INFO"));

        return ResponseEntity.ok(Map.of("message", "Account successfully created in database!", "accountNumber",
                saved.getAccountNumber()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String loginIdentifier = credentials.get("accountNumber");
        String pass = credentials.get("password");

        Optional<Account> accOpt;
        if (loginIdentifier.contains("@")) {
            accOpt = accountRepository.findByEmail(loginIdentifier);
        } else {
            accOpt = accountRepository.findById(loginIdentifier);
        }

        if (accOpt.isPresent() && accOpt.get().getPassword().equals(pass)) {
            return ResponseEntity.ok(accOpt.get());
        }

        return ResponseEntity.status(401).body(Map.of("error", "Invalid Account Details or Password"));
    }

    @GetMapping("/transactions/{accountNo}")
    public ResponseEntity<?> getTransactions(@PathVariable String accountNo) {
        List<Transaction> transactions = transactionRepository.findByAccountNumberOrderByTimestampDesc(accountNo);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/notifications/{accountNo}")
    public ResponseEntity<?> getNotifications(@PathVariable String accountNo) {
        return ResponseEntity.ok(notificationRepository.findByAccountNumberOrderByTimestampDesc(accountNo));
    }

    @PostMapping("/notifications/read/{id}")
    public ResponseEntity<?> markNotificationRead(@PathVariable Long id) {
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isPresent()) {
            Notification n = notifOpt.get();
            n.setRead(true);
            notificationRepository.save(n);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/subaccounts/{accountNo}")
    public ResponseEntity<?> getSubAccounts(@PathVariable String accountNo) {
        return ResponseEntity.ok(subAccountRepository.findByParentAccountNumber(accountNo));
    }

    @PostMapping("/subaccounts/create")
    public ResponseEntity<?> createSubAccount(@RequestBody Map<String, String> payload) {
        String parentAcc = payload.get("parentAccountNumber");
        String type = payload.get("accountType"); // Savings, Current

        String newAccNo = parentAcc + "-" + (int) (Math.random() * 900 + 100);
        SubAccount sa = new SubAccount(newAccNo, parentAcc, type, 0.0);
        subAccountRepository.save(sa);

        notificationRepository.save(new Notification(parentAcc,
                "New " + type + " Account (" + newAccNo + ") successfully opened.", "SUCCESS"));

        return ResponseEntity.ok(sa);
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(@RequestBody Map<String, Object> payload) {
        String fromAcc = (String) payload.get("fromAccount");
        String toAcc = (String) payload.get("toAccount");
        Double amount = Double.valueOf(payload.get("amount").toString());
        String pin = (String) payload.get("pin");

        Optional<Account> senderOpt = accountRepository.findById(fromAcc);
        Optional<Account> receiverOpt = accountRepository.findById(toAcc);

        if (senderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sender account not found."));
        }
        if (receiverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Receiver account not found in database."));
        }

        Account sender = senderOpt.get();
        Account receiver = receiverOpt.get();

        if (!sender.getPassword().equals(pin)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid PIN."));
        }

        if (sender.getBalance() < amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient balance."));
        }

        // Perform Transfer Logic
        sender.setBalance(sender.getBalance() - amount);
        receiver.setBalance(receiver.getBalance() + amount);

        accountRepository.save(sender);
        accountRepository.save(receiver);

        // Record Transactions
        String ref = "RAJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Transaction senderTxn = new Transaction(sender.getAccountNumber(), "Debit", amount, sender.getBalance(),
                "To Acc: " + receiver.getAccountNumber(), ref, LocalDateTime.now());
        Transaction receiverTxn = new Transaction(receiver.getAccountNumber(), "Credit", amount, receiver.getBalance(),
                "From Acc: " + sender.getAccountNumber(), ref, LocalDateTime.now());

        transactionRepository.save(senderTxn);
        transactionRepository.save(receiverTxn);

        notificationRepository.save(new Notification(sender.getAccountNumber(),
                "Debit of ₹" + amount + " to Account " + receiver.getAccountNumber(), "ALERT"));
        notificationRepository.save(new Notification(receiver.getAccountNumber(),
                "Credit of ₹" + amount + " from Account " + sender.getAccountNumber(), "SUCCESS"));

        return ResponseEntity.ok(Map.of("message", "Transfer successful!", "newBalance", sender.getBalance()));
    }

    // --- LOAN ENDPOINTS ---
    @Autowired
    private LoanRepository loanRepository;

        @PostMapping("/loans/apply")
    public ResponseEntity<?> applyLoan(@RequestBody Map<String, Object> payload) {
        String accountNo = (String) payload.get("accountNumber");
        String type = (String) payload.get("type");
        Double amount = Double.valueOf(payload.get("amount").toString());
        String reason = (String) payload.getOrDefault("reason", "N/A");
        Double emi = amount * 0.05; // 5% flat EMI for demo
        
        Loan loan = new Loan(accountNo, type, amount, emi, reason);
        loanRepository.save(loan);
        
        notificationRepository.save(new Notification(accountNo, "Your " + type + " application for Rs." + amount + " is now PENDING approval.", "INFO"));
        return ResponseEntity.ok(loan);
    }

    @GetMapping("/loans/{accountNo}")
    public ResponseEntity<?> getUserLoans(@PathVariable String accountNo) {
        return ResponseEntity.ok(loanRepository.findByAccountNumberOrderByAppliedAtDesc(accountNo));
    }

    // --- ADMIN ENDPOINTS ---
    @GetMapping("/admin/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(accountRepository.findAll());
    }

    @GetMapping("/admin/transactions")
    public ResponseEntity<?> getAllTransactions() {
        return ResponseEntity.ok(transactionRepository.findAll());
    }

    @GetMapping("/admin/loans/pending")
    public ResponseEntity<?> getPendingLoans() {
        return ResponseEntity.ok(loanRepository.findByStatusOrderByAppliedAtDesc("PENDING"));
    }

    @PostMapping("/admin/loans/approve/{id}")
    public ResponseEntity<?> approveLoan(@PathVariable Long id) {
        Optional<Loan> loanOpt = loanRepository.findById(id);
        if (loanOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Loan not found"));

        Loan loan = loanOpt.get();
        if (!loan.getStatus().equals("PENDING"))
            return ResponseEntity.badRequest().body(Map.of("error", "Loan is not pending"));

        loan.setStatus("APPROVED");
        loanRepository.save(loan);

        // Disburse loan amount to user
        Optional<Account> accOpt = accountRepository.findById(loan.getAccountNumber());
        if (accOpt.isPresent()) {
            Account acc = accOpt.get();
            acc.setBalance(acc.getBalance() + loan.getAmount());
            accountRepository.save(acc);

            // Record Disbursal Transaction
            String ref = "LOAN-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            Transaction t = new Transaction(acc.getAccountNumber(), "Credit", loan.getAmount(), acc.getBalance(),
                    "Loan Disbursal (" + loan.getType() + ")", ref, LocalDateTime.now());
            transactionRepository.save(t);

            notificationRepository.save(new Notification(acc.getAccountNumber(),
                    "Your " + loan.getType() + " of ₹" + loan.getAmount() + " was APPROVED! Funds disbursed.",
                    "SUCCESS"));
        }

        return ResponseEntity.ok(Map.of("message", "Loan Approved successfully"));
    }

    @PostMapping("/admin/loans/reject/{id}")
    public ResponseEntity<?> rejectLoan(@PathVariable Long id) {
        Optional<Loan> loanOpt = loanRepository.findById(id);
        if (loanOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Loan not found"));

        Loan loan = loanOpt.get();
        loan.setStatus("REJECTED");
        loanRepository.save(loan);

        notificationRepository.save(new Notification(loan.getAccountNumber(),
                "Your " + loan.getType() + " of ₹" + loan.getAmount() + " was REJECTED.", "ALERT"));

        return ResponseEntity.ok(Map.of("message", "Loan Rejected"));
    }
    @PostMapping("/profile/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload) {
        String accountNo = payload.get("accountNumber");
        Optional<Account> accOpt = accountRepository.findById(accountNo);
        if(accOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Account not found"));
        
        Account acc = accOpt.get();
        if(payload.containsKey("name")) acc.setName(payload.get("name"));
        if(payload.containsKey("email")) acc.setEmail(payload.get("email"));
        if(payload.containsKey("password") && !payload.get("password").isEmpty()) acc.setPassword(payload.get("password"));
        if(payload.containsKey("avatarUrl")) acc.setAvatarUrl(payload.get("avatarUrl"));
        
        accountRepository.save(acc);
        return ResponseEntity.ok(acc);
    }
}

