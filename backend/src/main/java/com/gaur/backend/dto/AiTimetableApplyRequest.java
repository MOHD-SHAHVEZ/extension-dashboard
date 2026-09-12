package com.gaur.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class AiTimetableApplyRequest {
    private List<ScheduleSlotRequest> slots = new ArrayList<>();
    private boolean replaceExisting;

    public List<ScheduleSlotRequest> getSlots() { return slots; }
    public void setSlots(List<ScheduleSlotRequest> slots) { this.slots = slots; }
    public boolean isReplaceExisting() { return replaceExisting; }
    public void setReplaceExisting(boolean replaceExisting) { this.replaceExisting = replaceExisting; }
}
