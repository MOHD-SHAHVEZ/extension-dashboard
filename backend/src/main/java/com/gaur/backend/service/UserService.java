package com.gaur.backend.service;
import org.springframework.stereotype.Service;
import com.gaur.backend.repository.UserRepository;
import com.gaur.backend.model.AppUser;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
@Service @RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepo;
    public Optional<AppUser> findByUsername(String u){ return userRepo.findByUsername(u); }
    public AppUser save(AppUser u){ return userRepo.save(u); }
}
