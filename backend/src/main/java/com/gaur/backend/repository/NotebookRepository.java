package com.gaur.backend.repository;

import com.gaur.backend.model.Notebook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotebookRepository extends JpaRepository<Notebook, Long> {

    List<Notebook> findByOwnerOrderByCreatedAtDesc(String owner);

    Optional<Notebook> findByIdAndOwner(Long id, String owner);
}
