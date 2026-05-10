-- Migration 004: AI Image Generation Fields
-- Adds image_style and image_aspect_ratio to content_jobs
-- for the AI image generation feature

ALTER TABLE public.content_jobs
ADD COLUMN IF NOT EXISTS image_style TEXT,
ADD COLUMN IF NOT EXISTS image_aspect_ratio TEXT;

COMMENT ON COLUMN public.content_jobs.image_style IS 'AI image generation style preset (photorealistic, illustration, cinematic, anime, 3d-render, flat-design)';
COMMENT ON COLUMN public.content_jobs.image_aspect_ratio IS 'AI image generation aspect ratio (9:16, 1:1, 16:9)';
