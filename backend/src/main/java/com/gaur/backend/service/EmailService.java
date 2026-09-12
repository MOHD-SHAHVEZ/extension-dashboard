package com.gaur.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Delivers OTP to the user. Always logs locally (dev-friendly);
 * also sends an HTML email when JavaMailSender is configured.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    /** Spec helper: sendOtpToUser(identifier, otp) — email or phone identifier. */
    public void sendOtpToUser(String identifier, String otp) {
        log.info("[OTP DELIVERY] identifier={} otp={} (expires in 5 minutes)", identifier, otp);
        System.out.println("[OTP DELIVERY] to=" + identifier + " otp=" + otp);

        if (identifier != null && identifier.contains("@") && mailSender != null) {
            sendOtpEmail(identifier, otp);
        }
    }

    public void sendOtpEmail(String toEmail, String otp) {
        if (mailSender == null) {
            log.warn("JavaMailSender not configured — OTP only logged for {}", toEmail);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Nexus - Your Verification Code");

            String htmlContent = """
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
                                <h1>Nexus</h1>
                            </div>
                            <div class="content">
                                <p>Hi there,</p>
                                <p>Welcome to Nexus! To verify your email address and securely access your account, please use the following verification code:</p>
                                
                                <div class="otp-box">
                                    <p class="otp-code">{{OTP}}</p>
                                </div>
                                
                                <p>This code will expire in <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
                                
                                <p style="margin-top: 35px; margin-bottom: 0;">Best regards,<br/><strong style="color: #4f46e5;">The Nexus Team</strong></p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2026 Nexus Technologies. All rights reserved.</p>
                                <p>This is an automated message, please do not reply.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """.replace("{{OTP}}", otp);

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP HTML email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP HTML email to {}: {}", toEmail, e.getMessage());
        }
    }
}
