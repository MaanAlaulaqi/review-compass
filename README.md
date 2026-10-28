# Review Compass dashboard

A static, browser-based academic prototype. No Python service, GPU, API key,
npm installation or build step is required. The live classifier is the trained
TF-IDF + Logistic Regression baseline. Transformer results are recorded evidence.


## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` from this folder, then open
`http://localhost:8000/`. Double-clicking `index.html` is not a supported launch
method because the app fetches its JSON files over HTTP.

## Files to edit

- `index.html`: content, controls and the four tabs.
- `style.css`: appearance and responsive layout.
- `app.mjs`: events, local data loading, rendering and CSV export.
- `classifier.mjs`: browser inference calculation.
- `classifier.json`: trained vocabulary, IDF values and classifier parameters.
- `snapshot.json`: 142 stored training reviews across eight parent products.
- `research.json`: recorded results, training protocol and dataset provenance.

All application paths are relative, so a project address with a repository
subpath works without a base-URL change. The application files match the
existing dashboard source. Hosting identity, credentials, Git history, the
report, presentation and full training dataset are excluded.

## What visitors can and cannot do

Visitors can classify review text, classify a short batch, download batch
predictions, inspect recorded experiment results and check exact quoted text.
Classification runs in the visitor's browser. The app sends no entered review
text to an inference API. The hosting provider still handles normal web traffic.

The Amazon-link lookup extracts an identifier and searches stored historical
reviews. It does not fetch Amazon reviews. Its selected sample does not estimate
current product-wide customer satisfaction. The exact-text checker does not
perform model extraction or establish semantic correctness.

The 142 demo reviews are part of the 7,500 training reviews. Validation and
testing used 900 reviews each. The browser does not run DistilBERT, Qwen or the
optional emotion model. Scores are uncalibrated and ratings provide proxy labels.

## Attribution and redistribution

Review text comes from Amazon Reviews 2023, `All_Beauty`, by McAuley Lab:
https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023

The exact dataset revision and source hash are in `research.json`. This package
does not grant a new license over upstream review content. Preserve provenance
and follow the dataset's applicable terms when publishing or redistributing it.

## Check after deployment

The Analyse review button should enable after the model loads. Try a review,
then a small batch. Open Product snapshot and use one of the available products.
Check the Experiment results and Extraction audit tabs. A 404 usually means
`index.html` is outside the configured publishing folder or deployment is pending.
If the classifier stays loading, check that the two `.mjs` files and all three
JSON files were uploaded alongside `index.html`.
