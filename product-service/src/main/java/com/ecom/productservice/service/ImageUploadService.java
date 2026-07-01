package com.ecom.productservice.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.ecom.productservice.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageUploadService {

    private final Cloudinary cloudinary;

    public List<String> uploadImages(MultipartFile[] files, Long productId) {
        if (files == null || files.length < 1 || files.length > 4) {
            throw new BadRequestException("Please upload between 1 and 4 images");
        }

        // Validate all files are images before uploading any
        for (MultipartFile file : files) {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new BadRequestException("Only image files are allowed (received: "
                    + (contentType != null ? contentType : "unknown") + ")");
            }
        }

        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                        "folder", "ecomshop/products/" + productId,
                        "resource_type", "image"
                    )
                );
                String secureUrl = (String) result.get("secure_url");
                urls.add(secureUrl);
                log.info("Uploaded image for product {}: {}", productId, secureUrl);
            } catch (IOException e) {
                throw new RuntimeException("Failed to upload image to Cloudinary: " + e.getMessage(), e);
            }
        }
        return urls;
    }

    public void deleteImage(String imageUrl) {
        try {
            String publicId = extractPublicId(imageUrl);
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Deleted Cloudinary image: {}", publicId);
        } catch (IOException e) {
            log.error("Failed to delete Cloudinary image {}: {}", imageUrl, e.getMessage());
        }
    }

    // URL format: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<name>.<ext>
    // We need everything after /upload/v<digits>/ as the public_id (without extension).
    private String extractPublicId(String imageUrl) {
        String[] parts = imageUrl.split("/upload/");
        if (parts.length < 2) return imageUrl;
        String afterUpload = parts[1].replaceFirst("v\\d+/", "");
        int dotIndex = afterUpload.lastIndexOf('.');
        return dotIndex > 0 ? afterUpload.substring(0, dotIndex) : afterUpload;
    }
}
