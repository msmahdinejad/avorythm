document.querySelector('#result').textContent = 'LOADING';
import('./recording-export-harness.mjs').then(() => {
  document.querySelector('#result').textContent = 'READY';
}).catch((error) => {
  document.querySelector('#result').textContent = `LOAD-FAIL ${error?.stack || error}`;
});
