package com.gaur.backend.dto;

/**
 * POST /api/otp/verify  and auth verify-otp (JWT-based).
 */
public class VerifyOtpRequest {
    /** Signed JWT from /api/otp/send (carries otp_hash + attempts). */
    @com.fasterxml.jackson.annotation.JsonAlias("verification_token")
    private String verificationToken;
    private String otp;
    /** Must match purpose embedded in the token. */
    private String purpose;

    /** Legacy alias used by older FE (maps to identifier lookup after verify). */
    private String email;

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
