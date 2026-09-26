package com.rajbank.controller;

import com.rajbank.model.Account;
import com.rajbank.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*") // Allows the Vercel frontend to access the API without being blocked by browser CORS
@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private AccountRepository accountRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Account account) {
        if(accountRepository.existsById(account.getAccountNumber())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Account number already exists."));
        }
        
        // Save to database (Cloud or Local)
        Account saved = accountRepository.save(account);
        return ResponseEntity.ok(Map.of("message", "Account successfully created in database!", "accountNumber", saved.getAccountNumber()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String loginIdentifier = credentials.get("accountNumber"); // This will now hold either email or acc no
        String pass = credentials.get("password");
        
        Optional<Account> accOpt;
        if (loginIdentifier.contains("@")) {
            accOpt = accountRepository.findByEmail(loginIdentifier);
        } else {
            accOpt = accountRepository.findById(loginIdentifier);
        }
        
        if(accOpt.isPresent() && accOpt.get().getPassword().equals(pass)) {
            // Success
            return ResponseEntity.ok(accOpt.get());
        }
        
        return ResponseEntity.status(401).body(Map.of("error", "Invalid Account Details or Password"));
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(@RequestBody Map<String, Object> payload) {
        String fromAcc = (String) payload.get("fromAccount");
        String toAcc = (String) payload.get("toAccount");
        Double amount = Double.valueOf(payload.get("amount").toString());
        String pin = (String) payload.get("pin"); // Note: Real apps would verify PIN against DB

        Optional<Account> senderOpt = accountRepository.findById(fromAcc);
        Optional<Account> receiverOpt = accountRepository.findById(toAcc);

        if(senderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sender account not found."));
        }
        if(receiverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Receiver account not found in database."));
        }

        Account sender = senderOpt.get();
        Account receiver = receiverOpt.get();

        if (!sender.getPassword().equals(pin)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid PIN."));
        }

        if(sender.getBalance() < amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient balance."));
        }

        // Perform Transfer Logic
        sender.setBalance(sender.getBalance() - amount);
        receiver.setBalance(receiver.getBalance() + amount);

        // Update Database
        accountRepository.save(sender);
        accountRepository.save(receiver);

        return ResponseEntity.ok(Map.of("message", "Transfer successful via Spring Boot API!", "newBalance", sender.getBalance()));
    }
}
