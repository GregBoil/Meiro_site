alter table public.product_images
  add constraint product_images_id_media_id_key unique (id, media_id);

alter table public.homepage_carousel
  add column product_image_id uuid,
  add constraint homepage_carousel_product_image_fkey
    foreign key (product_image_id, media_id)
    references public.product_images (id, media_id)
    on delete cascade;

create index homepage_carousel_product_image_id_idx
  on public.homepage_carousel (product_image_id);
