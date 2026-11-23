create unique index homepage_carousel_product_photo_unique
  on public.homepage_carousel (product_image_id);

create unique index homepage_carousel_legacy_media_unique
  on public.homepage_carousel (media_id) where product_image_id is null;

create index homepage_carousel_media_id_idx
  on public.homepage_carousel (media_id);

drop index public.homepage_carousel_media_unique;
drop index public.homepage_carousel_product_image_id_idx;
