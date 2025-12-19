/**
 * File Service - Firebase Storage operations for file uploads
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

export interface FileUploadResult {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: 'image' | 'file';
}

export interface FileValidationError {
    type: 'size' | 'type';
    message: string;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationError | null {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            type: 'size',
            message: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller file.`
        };
    }

    // Check file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

    if (!isImage && !isDocument) {
        return {
            type: 'type',
            message: 'Unsupported file type. Please upload images (JPEG, PNG, GIF, WebP) or documents (PDF, DOC, TXT).'
        };
    }

    return null;
}

/**
 * Compress image if needed
 */
export async function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    // Skip if not an image or small enough
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size < 500 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if needed
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        // Only use compressed if smaller
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    },
                    file.type,
                    quality
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Upload file to Firebase Storage
 */
export async function uploadFile(
    file: File,
    chatId: string,
    userId: string
): Promise<FileUploadResult> {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
        throw new Error(validationError.message);
    }

    // Determine file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const fileType = isImage ? 'image' : 'file';

    // Compress image if applicable
    const processedFile = isImage ? await compressImage(file) : file;

    // Create unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `chats/${chatId}/${userId}/${timestamp}_${sanitizedName}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, processedFile);

    // Get download URL
    const url = await getDownloadURL(storageRef);

    return {
        url,
        fileName: file.name,
        fileSize: processedFile.size,
        fileType
    };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
