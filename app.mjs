import { classify } from './classifier.mjs';

const $ = id => document.getElementById(id);

let model, snapshot, research;

const escape = s => String(s).replace(
    /[&<>"']/g,
    c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c])
);

// Navigation
function activate(name) {
    for (const panel of document.querySelectorAll('.panel')) {
        panel.classList.toggle('active', panel.id === name);
    }

    for (const button of document.querySelectorAll('nav button')) {
        button.classList.toggle('active', button.dataset.tab === name);
    }
}

for (const button of document.querySelectorAll('nav button')) {
    button.onclick = () => {
        activate(button.dataset.tab);
        history.replaceState(null, '', '#' + button.dataset.tab);
    };
}

if (
    ['review', 'product', 'evidence', 'extraction']
        .includes(location.hash.slice(1))
) {
    activate(location.hash.slice(1));
}

// Individual review classification
function analyse() {
    if (!model) {
        $('prediction').textContent = 'Classifier is still loading.';
        return;
    }

    const text = $('reviewText').value;

    if (!text.trim()) {
        $('prediction').textContent = 'Enter a review first.';
        $('probabilities').replaceChildren();
        $('featureCount').textContent = '';
        return;
    }

    const result = classify(text, model);

    $('prediction').textContent =
        result.label[0].toUpperCase() + result.label.slice(1);

    $('probabilities').innerHTML = model.labels.map((label, i) => `
        <div class="barrow">
            <span>${escape(label)}</span>
            <div class="track">
                <div
                    class="fill"
                    style="width:${100 * result.probabilities[i]}%"
                ></div>
            </div>
            <span>${(100 * result.probabilities[i]).toFixed(1)}%</span>
        </div>
    `).join('');

    $('featureCount').textContent =
        `${result.features} vocabulary features matched · ` +
        `trained Logistic Regression · C=${model.C}`;
}

const examples = [
    'Excellent quality and a lovely scent. I would buy this again.',
    'The bottle broke on the first day. A complete waste of money.',
    'It works, but the packaging is ordinary and the scent could be better.'
];

let next = 0;

$('example').onclick = () => {
    $('reviewText').value = examples[next++ % examples.length];

    if (model) {
        analyse();
    }
};

$('analyse').onclick = analyse;

// Batch classification and CSV export
$('batchAnalyse').onclick = () => {
    if (!model) {
        $('batchResults').textContent = 'Classifier is still loading.';
        return;
    }

    const texts = $('batchText').value
        .split('\n')
        .map(text => text.trim())
        .filter(Boolean)
        .slice(0, 100);

    if (!texts.length) {
        $('batchResults').textContent = 'Enter at least one review.';
        return;
    }

    const rows = texts.map(text => ({
        text,
        ...classify(text, model)
    }));

    $('batchResults').innerHTML = `
        <div class="tablewrap">
            <table>
                <thead>
                    <tr>
                        <th>Review</th>
                        <th>Predicted sentiment</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td>${escape(row.text)}</td>
                            <td>${escape(row.label)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <button class="secondary" id="downloadBatch">Download CSV</button>
    `;

    $('downloadBatch').onclick = () => {
        const quote = value =>
            '"' + String(value).replaceAll('"', '""') + '"';

        const content =
            'text,predicted_sentiment\n' +
            rows.map(row =>
                [row.text, row.label].map(quote).join(',')
            ).join('\n');

        const url = URL.createObjectURL(
            new Blob([content], { type: 'text/csv;charset=utf-8' })
        );

        const link = document.createElement('a');
        link.href = url;
        link.download = 'review_predictions.csv';
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
};

// Product selection
// An empty selection represents "All stored reviews".
$('productSelect').onchange = () => {
    const id = $('productSelect').value;

    $('productUrl').value = id
        ? 'https://www.amazon.com/dp/' + id
        : '';
};

// Historical product lookup
$('lookup').onclick = () => {
    if (!snapshot || !model) {
        $('productMessage').textContent = 'Data are still loading.';
        return;
    }

    $('productResults').replaceChildren();

    let asin = $('productSelect').value.toUpperCase();
    const enteredUrl = $('productUrl').value.trim();

    // A manually entered URL takes precedence over the dropdown.
    if (enteredUrl) {
        try {
            const url = new URL(enteredUrl);

            const allowed = [
                'amazon.com',
                'amazon.ae',
                'amazon.co.uk',
                'amazon.ca',
                'amazon.de',
                'amazon.fr',
                'amazon.in',
                'amazon.sa'
            ];

            const match = url.pathname.match(
                /\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i
            );

            const validHost = allowed.some(host =>
                url.hostname === host ||
                url.hostname.endsWith('.' + host)
            );

            if (url.protocol !== 'https:' || !validHost || !match) {
                throw new Error('Invalid Amazon URL');
            }

            asin = match[1].toUpperCase();
        } catch {
            $('productMessage').textContent =
                'Enter a valid HTTPS Amazon product URL with ' +
                '/dp/ASIN or /gp/product/ASIN.';
            return;
        }
    }

    const rows = asin
        ? snapshot.filter(review =>
            review.product_id.toUpperCase() === asin
        )
        : snapshot;

    $('productMessage').textContent = rows.length
        ? `${rows.length} stored training-sample reviews` +
          (asin ? ` for ${asin}` : ' across all available products') +
          '. No live reviews fetched.'
        : 'No stored reviews for this parent ID. ' +
          'Choose an available product above.';

    $('productResults').innerHTML = rows.map(review => `
        <article class="card">
            <span class="pill">
                ${escape(classify(review.text, model).label)}
            </span>
            <p class="small">Product: ${escape(review.product_id)}</p>
            <p>${escape(review.text)}</p>
        </article>
    `).join('');
};

// Exact-text grounding check
$('audit').onclick = () => {
    const text = $('auditText').value;
    const term = $('auditTerm').value;
    const quote = $('auditQuote').value;

    const ok = Boolean(
        term &&
        quote &&
        text.includes(term) &&
        text.includes(quote)
    );

    $('auditResult').className = ok ? 'success' : 'error';

    $('auditResult').textContent = ok
        ? 'Both strings occur exactly. Semantic correctness still needs human judgement.'
        : 'Check exact spelling and case: a nonempty term and quote must both occur in the source review.';
};

// Load data, then populate controls and recorded results.
async function init() {
    try {
        [model, snapshot, research] = await Promise.all(
            ['classifier.json', 'snapshot.json', 'research.json']
                .map(async url => {
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error('Could not load ' + url);
                    }

                    return response.json();
                })
        );

        // Populate this only after snapshot.json has loaded.
        const counts = new Map();

        for (const review of snapshot) {
            counts.set(
                review.product_id,
                (counts.get(review.product_id) || 0) + 1
            );
        }

        $('productSelect').innerHTML =
            `<option value="">All stored reviews (${snapshot.length})</option>` +
            [...counts.entries()]
                .map(([id, count]) => `
                    <option value="${escape(id)}">
                        ${escape(id)} (${count} reviews)
                    </option>
                `)
                .join('');

        // The handler is already defined above.
        $('productSelect').onchange();

        $('scoreTable').innerHTML =
            Object.entries(research.sentiment.scores)
                .map(([name, scores]) => `
                    <tr class="${name === 'DistilBERT' ? 'best' : ''}">
                        <td>${escape(name)}</td>
                        <td>${(100 * scores.accuracy).toFixed(2)}%</td>
                        <td>${scores.macro_f1.toFixed(4)}</td>
                    </tr>
                `)
                .join('');

        $('protocol').textContent = JSON.stringify({
            dataset: research.manifest.dataset,
            revision: research.manifest.revision,
            category: 'All_Beauty',
            splits: research.manifest.splits,
            transformer: {
                model: research.training.model,
                seed: research.training.seed,
                epochs: 2,
                selected_epoch: 1,
                max_length: 192,
                learning_rate: 2e-5,
                batch_size: 16
            }
        }, null, 2);

        $('analyse').disabled = false;
        $('analyse').textContent = 'Analyse review';
        $('batchAnalyse').disabled = false;
    } catch (error) {
        $('prediction').textContent = 'Could not load the dashboard data.';
        $('featureCount').textContent = error.message;
    }
}

init();