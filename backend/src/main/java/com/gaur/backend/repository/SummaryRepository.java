package com.gaur.backend.repository;

import com.gaur.backend.model.Summary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SummaryRepository extends JpaRepository<Summary, Long> {
    List<Summary> findByOwnerOrderByIdDesc(String owner);

    Page<Summary> findByOwnerOrderByIdDesc(String owner, Pageable pageable);

    Optional<Summary> findByOwnerAndSourceUrl(String owner, String sourceUrl);

    void deleteByOwnerAndSourceUrl(String owner, String sourceUrl);

    long countByOwner(String owner);

    long countByCreatedAt(String createdAt);
}
