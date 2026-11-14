# Rebuilding the curated gallery

The checked-in base dataset is extended by `scripts/content-batch*.json`. The public Pages artifact is the built output, not the base `dist/cases.json` alone.

```sh
python -m pip install Pillow==13.0.0
python scripts/build-curation.py
python scripts/sync-data.py
node scripts/verify-gallery.cjs
node tests/avatar.cjs
node tests/image-gallery.cjs
```

Media manifests pin reviewed originals with SHA-256. Locally stored text chunks reconstruct byte-identical originals when present; otherwise the builder checks already-published copies before permitted public source URLs. Any mismatch or missing media fails the build and leaves the last successful deployment live. Thumbnails are derived, not substitutes for original work.

Current author avatars are local assets. New static and video records preserve model claims, original post and prompt-reply links, references required, and template/excerpt limits. Owner-directed display does not establish an open license.
