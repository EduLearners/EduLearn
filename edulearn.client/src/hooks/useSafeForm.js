import { useEffect, useRef, useState } from 'react';

const KEY = (id) => `formDraft.${id}.v1`;

export function useSafeForm(formId, initialValues) {
  const [values, setValues] = useState(() => {
    try {
      const raw = sessionStorage.getItem(KEY(formId));
      return raw ? { ...initialValues, ...JSON.parse(raw) } : initialValues;
    } catch { return initialValues; }
  });
  const debounce = useRef();
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      try { sessionStorage.setItem(KEY(formId), JSON.stringify(values)); } catch { /* quota */ }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [formId, values]);
  const clearDraft = () => sessionStorage.removeItem(KEY(formId));
  return { values, setValues, clearDraft };
}
