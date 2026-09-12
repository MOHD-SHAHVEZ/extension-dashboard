package com.gaur.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret
    ) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    public String uploadAvatar(long userId, byte[] bytes) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "folder", "nexus/avatars",
                    "public_id", "user-" + userId,
                    "overwrite", true,
                    "invalidate", true,
                    "resource_type", "image"
            ));
            Object url = result.get("secure_url");
            if (url == null) url = result.get("url");
            if (url == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloudinary did not return an image URL");
            }
            return String.valueOf(url);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not upload photo to Cloudinary: " + ex.getMessage()
            );
        }
    }
}
