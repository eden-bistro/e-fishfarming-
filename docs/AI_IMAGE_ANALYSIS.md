# AquaSmart AI image analysis — setup and limitations

## What this change adds

- An authenticated `POST /api/ai/analyze-image` endpoint handled by the Cloudflare Worker.
- An image attachment control in the existing AquaSmart AI chat widget.
- Server-side validation for JPEG, PNG, and WebP signatures and a 4 MB image limit.
- A separate vision-model setting, `AI_VISION_MODEL`, with a default model identifier in the endpoint.
- Conservative aquaculture instructions: visible findings are observations, not a definitive fish-health diagnosis.

## Required deployment configuration

The image endpoint reuses the existing server-side `AI_API_KEY` and `AI_PROVIDER=groq` configuration. The existing text-chat model remains unchanged. Configure `AI_VISION_MODEL` as a Cloudflare Worker variable if the default is not available to the project's Groq account.

Set provider secrets using the deployment platform's secret management, not in browser-exposed variables or committed files. Confirm the selected vision model is currently enabled for the account before releasing.

## How to use

1. Open the AquaSmart AI chat widget.
2. Select the image attachment icon.
3. Choose a JPEG, PNG, or WebP image no larger than 4 MB.
4. Optionally enter a question, such as “Describe visible abnormalities on these tilapia.”
5. Send the request and review the response and its limitations.

## Current MVP limitations

- Images are sent to the configured model provider for inference and are **not stored in Supabase** by this implementation.
- Analysis results are not written to the database. The chat widget may retain the text response in the current browser's local storage, using its existing chat-history behavior.
- No specialized fish detector, calibrated length measurement, validated disease classifier, or continuous camera/feed monitoring is included yet.
- The endpoint does not yet implement persistent server-side rate limiting, per-farm usage quotas, or asynchronous jobs. Add these before broad public rollout.
- A 4 MB byte limit and image-signature checks reduce risk but do not replace full operational security controls, malware scanning where appropriate, or provider cost monitoring.
- Model output may be wrong. Do not use it as the sole basis for treatment, chemical dosing, or other high-impact fish-health decisions.

## Required follow-up before production scale

1. Add automated tests for authentication, invalid image signatures, oversized payloads, provider errors, and malformed model output.
2. Confirm RLS and user/farm isolation for AI records.
3. Add private Supabase Storage, retention/deletion rules, and durable `ai_conversations`, `ai_messages`, and `image_analyses` records if saved analyses are required.
4. Add server-side rate limiting and usage monitoring.
5. Evaluate fish counting, size estimation, feed observation, and health screening separately against labeled, expert-reviewed images.
6. Run typecheck, lint, tests, build, and authenticated staging smoke tests before production deployment.
