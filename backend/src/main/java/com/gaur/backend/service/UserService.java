package com.gaur.backend.service;

import com.gaur.backend.model.AppUser;
import com.gaur.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepo;

    public UserService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    public Optional<AppUser> findByUsername(String u) {
        return userRepo.findByUsername(u);
    }

    public AppUser save(AppUser u) {
        return userRepo.save(u);
    }

    public AppUser requireByUsername(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
