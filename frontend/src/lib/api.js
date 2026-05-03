const DEFAULT_API_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export function getAssetUrl(url) {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }

  return url;
}

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? {
        ...(options.headers || {}),
      }
    : {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Erro na requisição.');
    Object.assign(error, data);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function apiUpload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${API_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent);
    };

    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');

      if (xhr.status < 200 || xhr.status >= 300) {
        const error = new Error(data.message || 'Erro na requisição.');
        Object.assign(error, data);
        error.status = xhr.status;
        reject(error);
        return;
      }

      resolve(data);
    };

    xhr.onerror = () => {
      reject(new Error('Erro de conexão durante o upload.'));
    };

    xhr.send(formData);
  });
}