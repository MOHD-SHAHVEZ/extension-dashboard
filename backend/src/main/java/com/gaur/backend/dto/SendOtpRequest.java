package com.gaur.backend.dto;

/**
 * POST /api/otp/send
 */
public class SendOtpRequest {
    /** Email or phone number. */
    private String identifier;
    /** signup | login | reset-password | verify-email */
    private String purpose;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
