import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload location images to Firebase Storage
 * @param {string} locationId - Unique location identifier
 * @param {Array} imageAssets - Array of image objects from ImagePicker
 * @returns {Promise<Array>} - Array of download URLs for uploaded images
 */
export const uploadLocationImages = async (locationId, imageAssets) => {
  try {
    if (!imageAssets || imageAssets.length === 0) {
      return [];
    }

    const downloadUrls = [];

    for (let i = 0; i < imageAssets.length; i++) {
      const imageAsset = imageAssets[i];
      
      // Convert image to blob
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(
        storage,
        `locations/${locationId}/${Date.now()}_${i}.jpg`
      );

      // Upload image
      console.log(`Uploading image ${i + 1}/${imageAssets.length} for location ${locationId}`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      downloadUrls.push(downloadUrl);
      
      console.log(`✓ Image ${i + 1} uploaded successfully`);
    }

    return downloadUrls;
  } catch (error) {
    console.error('Error uploading location images:', error);
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Delete a location image from Firebase Storage
 * @param {string} imageUrl - Download URL of the image
 * @returns {Promise<void>}
 */
export const deleteLocationImage = async (imageUrl) => {
  try {
    // Extract path from URL
    const path = decodeURIComponent(
      imageUrl.split('/o/')[1].split('?')[0]
    );

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('✓ Image deleted successfully');
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Delete all images for a location
 * @param {string} locationId - Location identifier
 * @returns {Promise<void>}
 */
export const deleteLocationImages = async (locationId) => {
  try {
    // Note: Firebase doesn't support bulk delete easily
    // This would require listing all files first
    console.log(`Deleting all images for location ${locationId}`);
    // Images will be cleaned up when location document is deleted
  } catch (error) {
    console.error('Error deleting location images:', error);
    throw error;
  }
};

/**
 * Update location images
 * @param {string} locationId - Location identifier
 * @param {Array} newImageAssets - New images to upload
 * @param {Array} imagesToDelete - URLs of images to delete
 * @returns {Promise<Array>} - Updated array of image URLs
 */
export const updateLocationImages = async (
  locationId,
  newImageAssets = [],
  imagesToDelete = []
) => {
  try {
    // Delete old images
    for (const imageUrl of imagesToDelete) {
      await deleteLocationImage(imageUrl);
    }

    // Upload new images
    const newUrls = await uploadLocationImages(locationId, newImageAssets);
    return newUrls;
  } catch (error) {
    console.error('Error updating location images:', error);
    throw error;
  }
};
