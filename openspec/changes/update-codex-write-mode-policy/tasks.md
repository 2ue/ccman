## 1. Implementation

- [x] 1.1 Add all-tool write mode spec and design
- [x] 1.2 Introduce explicit merge/overwrite write modes where needed in affected writers
- [x] 1.3 Route normal standard management flows to merge mode
- [x] 1.4 Keep `gmn` / `gmn1` / `gmncode` / related shortcut flows on overwrite mode for every configured tool
- [x] 1.5 Ensure shortcut flows do not apply an intermediate merge write before the final overwrite when updating an already-active provider
- [x] 1.6 Align `@2ue/aicoding` and `scripts/setup-gmn*.mjs` with the same shortcut overwrite policy
- [x] 1.7 Add isolated tests for both write modes and the shortcut-flow purity rule
- [x] 1.8 Update docs to explain command write semantics across tools and scripts
