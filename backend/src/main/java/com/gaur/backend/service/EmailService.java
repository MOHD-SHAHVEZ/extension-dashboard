package com.gaur.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * OTP mail: HTTPS APIs first (Render blocks Gmail SMTP on port 587).
 * SMTP is local-only unless MAIL_SMTP_ENABLED=true.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_URL = "https://api.resend.com/emails";
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.mail.brevo.api-key:}")
    private String brevoApiKey;

    @Value("${app.mail.from-name:eBag AI}")
    private String fromName;

    @Value("${app.mail.from-email:}")
    private String fromEmail;

    @Value("${app.mail.smtp.enabled:false}")
    private boolean smtpEnabled;

    public EmailService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void sendOtpToUser(String toEmail, String otp) {
        log.info("[OTP DELIVERY] to={} otp={}", toEmail, otp);
        sendOtpEmail(toEmail, otp);
    }

    public void sendOtpEmail(String toEmail, String otp) {
        String html = buildOtpHtml(otp);
        String subject = "eBag AI - Your Verification Code";

        if (hasText(resendApiKey)) {
            if (sendViaResend(toEmail, subject, html)) {
                return;
            }
        }

        if (hasText(brevoApiKey)) {
            if (sendViaBrevo(toEmail, subject, html)) {
                return;
            }
        }

        if (smtpEnabled && mailSender != null) {
            sendViaSmtp(toEmail, subject, html);
            return;
        }

        log.warn(
                "OTP email not sent over the network. Set RESEND_API_KEY or BREVO_API_KEY on Render (SMTP is blocked there). OTP is still in [OTP DELIVERY] logs.");
    }

    private boolean sendViaResend(String toEmail, String subject, String html) {
        String sender = hasText(fromEmail)
                ? fromName + " <" + fromEmail.trim() + ">"
                : fromName + " <onboarding@resend.dev>";
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("from", sender);
            ArrayNode to = body.putArray("to");
            to.add(toEmail);
            body.put("subject", subject);
            body.put("html", html);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("OTP email sent via Resend to {}", toEmail);
                return true;
            }
            log.error("Resend rejected OTP mail to {} ({}): {}", toEmail, response.statusCode(), response.body());
        } catch (Exception e) {
            log.error("Resend OTP mail failed for {}: {}", toEmail, e.getMessage());
        }
        return false;
    }

    private boolean sendViaBrevo(String toEmail, String subject, String html) {
        if (!hasText(fromEmail)) {
            log.error("BREVO_API_KEY is set but MAIL_FROM_EMAIL is empty — cannot send.");
            return false;
        }
        try {
            ObjectNode body = objectMapper.createObjectNode();
            ObjectNode sender = body.putObject("sender");
            sender.put("name", fromName);
            sender.put("email", fromEmail.trim());
            ArrayNode to = body.putArray("to");
            ObjectNode recipient = to.addObject();
            recipient.put("email", toEmail);
            body.put("subject", subject);
            body.put("htmlContent", html);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("api-key", brevoApiKey.trim())
                    .header("accept", "application/json")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("OTP email sent via Brevo to {}", toEmail);
                return true;
            }
            log.error("Brevo rejected OTP mail to {} ({}): {}", toEmail, response.statusCode(), response.body());
        } catch (Exception e) {
            log.error("Brevo OTP mail failed for {}: {}", toEmail, e.getMessage());
        }
        return false;
    }

    private void sendViaSmtp(String toEmail, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("OTP HTML email sent via SMTP to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP HTML email to {}: {}", toEmail, e.getMessage());
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String buildOtpHtml(String otp) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
                        .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                        .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 35px 20px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
                        .content { padding: 40px 35px; color: #333333; line-height: 1.6; }
                        .content p { margin: 0 0 20px 0; font-size: 15px; color: #4b5563; }
                        .otp-box { background-color: #f8fafc; border-radius: 12px; padding: 25px; text-align: center; margin: 35px 0; border: 2px dashed #cbd5e1; }
                        .otp-code { font-size: 38px; font-weight: 800; color: #0f172a; letter-spacing: 10px; margin: 0; }
                        .footer { background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; }
                        .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>eBag AI</h1>
                        </div>
                        <div class="content">
                            <p>Hi there,</p>
                            <p>Welcome to eBag AI! To verify your email address and securely access your account, please use the following verification code:</p>
                            <div class="otp-box">
                                <p class="otp-code">{{OTP}}</p>
                            </div>
                            <p>This code will expire in <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
                            <p style="margin-top: 35px; margin-bottom: 0;">Best regards,<br/><strong style="color: #4f46e5;">The eBag AI Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 eBag AI. Notes, plan &amp; AI summaries.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.replace("{{OTP}}", otp);
    }
}
