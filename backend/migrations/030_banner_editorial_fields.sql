-- Editable split hero and category banner content. Existing banners are preserved.
ALTER TABLE banners
  ADD COLUMN subtitle VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN button_text VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN secondary_button_text VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN secondary_link_url VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN secondary_image_url VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN secondary_image_alt VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN background_color VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN image_fit VARCHAR(20) NOT NULL DEFAULT '';
