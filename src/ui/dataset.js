export function encodeDatasetValue(value) {
  const rawValue = String(value ?? "");
  try {
    return encodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export function decodeDatasetValue(value) {
  const rawValue = String(value ?? "");
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export function datasetValueMatches(value, expected) {
  const rawValue = String(value ?? "");
  const expectedValue = String(expected ?? "");
  return rawValue === expectedValue || decodeDatasetValue(rawValue) === expectedValue;
}
