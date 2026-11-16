# Licensed creator additions · 2026-11-16

Three works transferred into the current batch-based build, not merged from the stale PR #7 branch. Previous records, assets and selection remain intact.

## Review and provenance

- **zenlee123 / AIImage · Ukiyo-e Astronaut**: https://github.com/zenlee123/awesome-ai-image-prompts#ukiyoe-astronaut . Current README explicitly applies CC0 1.0 to prompts and images. `prompts.json` pairs this exact English prompt and image with `google/gemini-3-pro-image-t2i`; source-declared, not independently generated. Blue/cream woodblock composition, complete astronaut and wave, legible silhouette and consistent paper texture. The decorative red seal is part of the supplied image. 768×1028, original WebP unchanged.
- **Taste by Journey · Shimmer Lounge Over the Sea**: https://tastejourney.art/i/191 . https://tastejourney.art/support explicitly permits republishing images and prompts in attributed collections under CC BY 4.0. Original V7 prompt and all three profile codes retained; account/profile dependencies disclosed. Coherent mosaic texture, ocean light and rounded furniture; original 816×1456 JPEG unchanged. Chinese title translated and thumbnail derived; both modifications disclosed. Credit does not imply endorsement.
- **Vibe Coder’s Life / kondasviktor · House cutaway**: https://github.com/kondasviktor/vcl-ai-image-prompts/blob/main/recipes/cutaway.md . `LICENSE-DATA` explicitly covers recipes and example images under CC BY 4.0. The source labels this as a style demo, with model tests Pending. The original prompt is an associated recipe, not a generation log. Source `examples/cutaway/before.png` was also opened and visually reviewed: exterior and cutaway are not geometrically identical, so the detail explicitly warns this is not faithful architectural reconstruction or a tested text-only result. Prompt requests 16:9; actual source PNG is 1400×933. Single cohesive cutaway image; conceptual architecture, not construction documentation.

Original files were downloaded from their creator sources and visually reviewed on 2026-11-16. Git blob hashes match the corresponding originals already stored on PR #7: Taste `86bf1c480052e90a8b7f3952d6e955c0bd51fe56`, Zenlee `fa866b4aecda0f55a2aa2624ed940edb879898f7`, VCL `3293c74de0254c2a06a7f6efabb8aea6b7eac89f`. SHA-256 pins and source URLs are in `scripts/media-batch13.json` and each case. Duplicate check: none of the three IDs, names or source images occur in the existing selected records.

Author avatars use the two creators' public GitHub avatars and Taste's source-site favicon for identification only, with separate source URLs. Do not extend the works' CC license to these identity assets or imply endorsement. Work originals are unchanged; thumbnails are resized/compressed by the existing builder. Attribution and full license links stay with each work.

## Integration

- `content-batch13.json` preserves exact prompts, source model claims, attribution, license and reproduction caveats.
- Only the three reviewed original-source URLs are added to the media builder's allowlist; SHA-256 checks still apply.
- Static gallery admission now recognizes `cc0-1.0` and `cc-by-4.0`, without altering any existing record's authorization.
- Site-source labels and license link text no longer mislabel website records as X posts or every license as MIT.
- Three entries added to current selection; no old PR merged or closed. Images in a reference/input role are not counted as additional works.
