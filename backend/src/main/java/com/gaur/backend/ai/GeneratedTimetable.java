package com.gaur.backend.ai;

import java.util.List;

public record GeneratedTimetable(
        String summary,
        List<GeneratedTimetableSlot> slots
) {}
