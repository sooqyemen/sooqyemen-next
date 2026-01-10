import imageCompression from 'browser-image-compression';

const uploadImages = async () => {
  if (!images.length) return [];
  const out = [];

  for (const file of images) {
    try {
      // Compression options
      const options = {
        maxSizeMB: 0.3, // Max size in MB (e.g., 300KB)
        maxWidthOrHeight: 1280, // Max image dimensions (optional)
        useWebWorker: true, // Use web workers for better performance
      };

      // Compress the image
      const compressedFile = await imageCompression(file, options);

      // Upload the compressed file
      const safeName = String(compressedFile.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(compressedFile);

      const url = await ref.getDownloadURL();
      out.push(url);
    } catch (err) {
      console.error('Image compression/upload failed:', err);
    }
  }

  return out;
};