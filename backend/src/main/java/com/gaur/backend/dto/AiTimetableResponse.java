package com.gaur.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class AiTimetableResponse {
    private String summary;
    private List<ScheduleSlotRequest> slots = new ArrayList<>();

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public List<ScheduleSlotRequest> getSlots() { return slots; }
    public void setSlots(List<ScheduleSlotRequest> slots) { this.slots = slots; }
}
