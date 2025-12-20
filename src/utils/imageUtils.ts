/**
 * Image Utilities - Compression and optimization for profile/group photos
 * 
 * Firebase Free Tier optimization: Reduces bandwidth and storage usage
 */

const MAX_WIDTH = 512; // Max width for profile/group photos
const MAX_SIZE_MB = 2; // Max file size before upload
const JPEG_QUALITY = 0.7; // Compression quality

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    wasCompressed: boolean;
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'Please select an image file' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' };
    }

    // Check file size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return { valid: false, error: `Image must be less than ${MAX_SIZE_MB}MB` };
    }

    return { valid: true };
}

/**
 * Compress and resize image for profile/group photos
 * Returns original file if compression doesn't reduce size
 */
export async function compressProfileImage(file: File): Promise<CompressionResult> {
    const originalSize = file.size;

    // Skip compression for small files (less than 100KB)
    if (file.size < 100 * 1024) {
        return {
            file,
            originalSize,
            compressedSize: file.size,
            wasCompressed: false
        };
    }

    // Skip GIFs (animated)
    if (file.type === 'image/gif') {
        return {
            file,
            originalSize,
            compressedSize: file.size,
            wasCompressed: false
        };
    }

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if larger than max width
                if (width > MAX_WIDTH) {
                    height = (height * MAX_WIDTH) / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve({ file, originalSize, compressedSize: file.size, wasCompressed: false });
                    return;
                }

                // Draw with white background (for PNG transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG for best compression
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve({ file, originalSize, compressedSize: file.size, wasCompressed: false });
                            return;
                        }

                        // Create new file with .jpg extension
                        const baseName = file.name.replace(/\.[^.]+$/, '');
                        const compressedFile = new File([blob], `${baseName}.jpg`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        // Only use compressed if smaller
                        if (compressedFile.size < originalSize) {
                            resolve({
                                file: compressedFile,
                                originalSize,
                                compressedSize: compressedFile.size,
                                wasCompressed: true
                            });
                        } else {
                            resolve({
                                file,
                                originalSize,
                                compressedSize: file.size,
                                wasCompressed: false
                            });
                        }
                    },
                    'image/jpeg',
                    JPEG_QUALITY
                );
            };

            img.onerror = () => {
                resolve({ file, originalSize, compressedSize: file.size, wasCompressed: false });
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            resolve({ file, originalSize, compressedSize: file.size, wasCompressed: false });
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compress image and return as Base64 string for Firestore storage
 * Uses smaller dimensions and lower quality for database storage
 * 
 * Firestore limit: 1MB per document, so we keep images small (~50-100KB max)
 */
export interface Base64CompressionResult {
    base64: string;
    originalSize: number;
    compressedSize: number;
    wasCompressed: boolean;
}

const BASE64_MAX_WIDTH = 256; // Smaller for database storage
const BASE64_JPEG_QUALITY = 0.6; // Lower quality for smaller size

export async function compressImageToBase64(file: File): Promise<Base64CompressionResult> {
    const originalSize = file.size;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down to max width
                if (width > BASE64_MAX_WIDTH) {
                    height = (height * BASE64_MAX_WIDTH) / width;
                    width = BASE64_MAX_WIDTH;
                }

                // Also limit height
                if (height > BASE64_MAX_WIDTH) {
                    width = (width * BASE64_MAX_WIDTH) / height;
                    height = BASE64_MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 JPEG
                const base64 = canvas.toDataURL('image/jpeg', BASE64_JPEG_QUALITY);
                const compressedSize = Math.round((base64.length * 3) / 4); // Approximate byte size

                resolve({
                    base64,
                    originalSize,
                    compressedSize,
                    wasCompressed: compressedSize < originalSize
                });
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

