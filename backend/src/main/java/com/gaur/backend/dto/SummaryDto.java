package com.gaur.backend.dto;
import lombok.Data;
@Data
public class SummaryDto {
    public Long id;
    public String title;
    public String excerpt;
    public String content;
    public String sourceUrl;
    public Boolean pinned;
}
