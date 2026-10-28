export function classify(text, model) {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || [];
  const counts = new Map();
  function add(term) {
    const i = Object.hasOwn(model.vocabulary, term)
      ? model.vocabulary[term]
      : undefined;
    if (i !== undefined) counts.set(i, (counts.get(i) || 0) + 1);
  }
  for (let i = 0; i < tokens.length; i++) {
    add(tokens[i]);
    if (i + 1 < tokens.length) add(tokens[i] + " " + tokens[i + 1]);
  }
  const values = [];
  let norm = 0;
  for (const [i, n] of counts) {
    const v = (1 + Math.log(n)) * model.idf[i];
    values.push([i, v]);
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  const scores = model.intercept.slice();
  for (const [i, v] of values)
    for (let c = 0; c < scores.length; c++)
      scores[c] += (model.coef[c][i] * v) / norm;
  const max = Math.max(...scores),
    exps = scores.map((s) => Math.exp(s - max)),
    sum = exps.reduce((a, b) => a + b, 0);
  const probabilities = exps.map((x) => x / sum),
    index = scores.indexOf(max);
  return { label: model.labels[index], probabilities, features: values.length };
}
