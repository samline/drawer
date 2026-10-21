# Website fonts

`shared/components/Fonts.astro` owns the website's font faces and preloads. Home, Examples and Docs consume it. Vite emits these files with content hashes under each app's configured base path; builds and page loads do not contact a font service.

The Latin WOFF2 files come from Fontsource 5.3.0 packages on the npm registry:

| File                                      | Source package                              | Weights/style   |  Bytes |
| ----------------------------------------- | ------------------------------------------- | --------------- | -----: |
| `inter-latin-400-700-normal.woff2`        | `@fontsource-variable/inter@5.3.0`          | 400–700, normal | 36,180 |
| `instrument-serif-latin-400-italic.woff2` | `@fontsource/instrument-serif@5.3.0`        | 400, italic     | 22,128 |
| `jetbrains-mono-latin-wght-normal.woff2`  | `@fontsource-variable/jetbrains-mono@5.3.0` | 100–800, normal | 40,404 |

Total: 98,712 bytes (96.4 KiB). Variable Inter and JetBrains Mono replace separate per-weight downloads. Only Inter and Instrument Serif are preloaded for the initial headings; JetBrains Mono is discovered through CSS. All faces use `font-display: swap` and retain the existing shared family tokens and system fallbacks.

Inter retains the complete source character map and OpenType features, with its variable weight axis limited to the website's 400–700 range. Instrument Serif and JetBrains Mono are unmodified. To reproduce Inter from `files/inter-latin-wght-normal.woff2` in the source npm package, use FontTools 4.60.1 with WOFF2 support (Brotli 1.2.0):

```sh
fonttools varLib.instancer inter-latin-wght-normal.woff2 wght=400:700 --output=inter-latin-400-700-normal.woff2
```

Source SHA-256: `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62`. Output SHA-256: `242364ec31ca8be955e351e69e8b9a00688e149c448e1ff177f9dc638a320b8d`. Review the retained range if a new design uses weights outside it.

Each family is licensed under SIL Open Font License 1.1. Preserve the adjacent `*-OFL.txt` files when updating these assets. The landing's separate TTF files remain inputs to its generated social image.

The site currently publishes English content. Review character coverage before introducing another language; do not assume the Latin subset covers every locale. When updating a font, record its source version and measured size here, preserve its license, and run both apps' checks and browser suites, including enlarged text, no JavaScript, exact copies and delayed-control initialization.
