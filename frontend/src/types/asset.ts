export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  file_size: number;
  channels: number;
  color_mode: string;
  color_space: string | null;
  has_transparency: boolean;
};

export type Asset = {
  asset_id: string;
  filename: string;
  content_url: string;
  metadata: ImageMetadata;
};

export type UploadError = {
  code: string;
  message: string;
  request_id: string;
  field_errors: Array<{ field: string; message: string }>;
};
