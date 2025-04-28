import { cloudinary } from "../config/cloudinaryConfig.js";

export const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No media file uploaded" });
    }

    const isVideo = file.mimetype.startsWith("video");
    const resourceType = isVideo ? "video" : "image";

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType,
    });

    res.status(201).json({
      message: "Upload successful",
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading media",
      error: error.message,
    });
  }
};
