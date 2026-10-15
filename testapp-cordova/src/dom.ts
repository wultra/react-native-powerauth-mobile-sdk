// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

export function button(label: string, onClick: () => void, disabled = false) {
  const node = element('button', label);
  node.type = 'button';
  node.disabled = disabled;
  node.addEventListener('click', onClick);
  return node;
}

export function describe(value: unknown): string {
  if (value === undefined) {
    return 'Completed successfully.';
  }
  if (value && typeof value === 'object' && ('code' in value || 'message' in value)) {
    return [
      'code' in value ? value.code : undefined,
      'message' in value ? value.message : undefined,
    ].filter((part) => part != null).join(': ');
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
