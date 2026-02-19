import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration du test: 10 utilisateurs simultanés pendant 30 secondes
export const options = {
  vus: 10, // 10 utilisateurs virtuels
  duration: '30s', // Durée du test
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes doivent être < 500ms
    http_req_failed: ['rate<0.1'], // Moins de 10% d'erreurs
  },
};

const BASE_URL = 'https://3000-iusza8oc1jdocziz5swrj-0ebcd05b.us2.manus.computer';

export default function () {
  // Test 1: Page d'accueil
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'Home status 200': (r) => r.status === 200,
    'Home load < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);

  // Test 2: Page Dashboard (sans auth - redirige vers login)
  const dashboardRes = http.get(`${BASE_URL}/dashboard`);
  check(dashboardRes, {
    'Dashboard responds': (r) => r.status === 200 || r.status === 302,
  });
  sleep(1);

  // Test 3: Page Upload (sans auth - redirige vers login)
  const uploadRes = http.get(`${BASE_URL}/upload`);
  check(uploadRes, {
    'Upload responds': (r) => r.status === 200 || r.status === 302,
  });
  sleep(1);

  // Test 4: Page Analytics (sans auth - redirige vers login)
  const analyticsRes = http.get(`${BASE_URL}/analytics`);
  check(analyticsRes, {
    'Analytics responds': (r) => r.status === 200 || r.status === 302,
  });
  sleep(1);
}
