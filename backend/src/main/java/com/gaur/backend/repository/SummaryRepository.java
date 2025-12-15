package com.gaur.backend.repository;
import com.gaur.backend.model.Summary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SummaryRepository extends JpaRepository<Summary, Long> {
    List<Summary> findByOwnerOrderByIdDesc(String owner);
}
