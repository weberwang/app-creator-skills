# Image Prompt Principles

Use these principles for page effect images and standalone visual assets.

## Separate Planning From Generation

Keep PRD traceability, requirement mappings, rationale, review notes, and implementation analysis in the planning artifact. Do not paste that material into the image model prompt. Send only the compact final prompt.

## Prompt Shape

Build the final prompt in this order:

1. **Outcome:** what image to create and what user task or visual role it serves.
2. **Essential structure/content:** only the few regions, objects, copy, or state facts that determine correctness.
3. **Visual direction:** the approved signature plus a small set of concrete visual cues.
4. **Non-negotiables:** only constraints whose violation would change scope, trust, brand, state, asset compositing, or usability.
5. **Output:** viewpoint, canvas, background requirement, and dimensions when required.

Use short sentences and concrete nouns or visual properties. If one sentence conveys the requirement, do not expand it into a paragraph.

## Leave Creative Space

Specify the destination and boundaries, not every design decision. Unless frozen evidence requires otherwise, let the image model decide secondary composition, lighting nuance, decorative rhythm, micro-texture, and supporting details. Do not enumerate every component token, spacing value, shadow, radius, or ornament.

## Inclusion Test

Keep a detail only when removing it could materially change one of these:

- the user task or required content;
- the approved visual signature or brand identity;
- the page state or asset role;
- trust, safety, accessibility, or compositing behavior;
- the required output format or dimensions.

Move every other detail back to the planning artifact or omit it.

## Language Rules

- Prefer one concrete direction over stacked adjectives.
- Avoid empty words such as “premium”, “beautiful”, “modern”, or “polished” unless followed by a visible property.
- Do not repeat the same constraint in positive and negative form.
- Keep negative instructions to the few likely, material failure modes.
- Remove contradictory instructions. Resolve conflicts in this order: confirmed scope/content, frozen visual direction, state and usability, output specification, optional styling.
- Do not combine unrelated style references or long keyword lists.

## Final Check

Before generation, verify that the prompt:

- can be understood on one read;
- has one clear outcome and one coherent direction;
- contains no planning rationale or source-path narration;
- contains no duplicated or conflicting constraint;
- leaves secondary visual decisions open;
- is the shortest version that preserves correctness.

## Compact Page Pattern

```text
Design a high-fidelity [page] for [product/user], focused on [primary task] in [state].
Structure it around [essential regions and hierarchy], using [required content/copy].
Follow [approved visual direction/signature] with [a few concrete visual cues].
Keep [critical scope, trust, accessibility, or interaction constraints]; choose secondary composition and decorative details freely within that direction.
Output [viewpoint, frame rule, and required dimensions]. Avoid only [material failure modes].
```

## Compact Asset Pattern

```text
Create [asset] for [page role], matching [silhouette, crop, palette, material, or lighting traits that are actually frozen].
Keep [critical content and edge treatment]; choose secondary detail freely.
Use [transparent/retained/masked] background and output at [dimensions]. Avoid [material failure modes].
```

