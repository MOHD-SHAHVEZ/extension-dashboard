package com.gaur.backend.service;
import org.springframework.stereotype.Service; import lombok.RequiredArgsConstructor;
import com.gaur.backend.repository.SummaryRepository;
import com.gaur.backend.model.Summary;
import java.util.List;
@Service @RequiredArgsConstructor
public class SummaryService {
    private final SummaryRepository repo;
    public List<Summary> findByOwner(String owner){ return repo.findByOwnerOrderByIdDesc(owner); }
    public List<Summary> findAll(){ return repo.findAll(); }
    public Summary save(Summary s){ return repo.save(s); }
    public void delete(Long id){ repo.deleteById(id); }
    public Summary findById(Long id){ return repo.findById(id).orElse(null); }
}
